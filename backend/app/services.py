import calendar
import csv
import hashlib
import io
import json
import os
import re
from datetime import date
from decimal import Decimal
from pathlib import Path
import pandas as pd
from sqlalchemy import select
from .models import Transaction, Budget, Achievement, ImportRecord
from .schemas import TransactionIn

CATEGORIES = [
    "Food",
    "Transport",
    "Shopping",
    "Entertainment",
    "Bills",
    "Health",
    "Education",
    "Other",
]
RULES = json.loads(
    Path(
        os.getenv(
            "CATEGORY_RULES_PATH", Path(__file__).with_name("category_rules.json")
        )
    ).read_text()
)


def categorize(description, merchant="", category=None):
    if category:
        return category
    text = (description + " " + merchant).casefold()
    return next(
        (
            category
            for category, words in RULES.items()
            if any(word.casefold() in text for word in words)
        ),
        "Other",
    )


def fingerprint(data):
    def normalize(value):
        return re.sub(r"\W+", "", str(value).casefold())

    # Category is deliberately excluded: recategorizing never enables repeat imports.
    fields = [
        str(data.date),
        normalize(data.description),
        normalize(data.merchant),
        str(int(data.amount * 100)),
        data.type,
    ]
    return hashlib.sha256("|".join(fields).encode()).hexdigest()


def transaction_values(data):
    values = data.model_dump(exclude={"amount", "category"})
    return dict(
        **values,
        amount_cents=int(data.amount * 100),
        category=categorize(data.description, data.merchant, data.category),
        fingerprint=fingerprint(data),
    )


def serialize(t):
    return dict(
        id=t.id,
        date=t.date,
        description=t.description,
        merchant=t.merchant,
        amount=Decimal(t.amount_cents) / 100,
        type=t.type,
        category=t.category,
        created_at=t.created_at,
    )


def month_bounds(month):
    start = date.fromisoformat(month + "-01")
    end = date(start.year + (start.month == 12), start.month % 12 + 1, 1)
    return start, end


def month_transactions(db, month):
    start, end = month_bounds(month)
    return db.scalars(
        select(Transaction).where(Transaction.date >= start, Transaction.date < end)
    ).all()


def categories(db, month):
    rows = month_transactions(db, month)
    return [
        dict(
            category=c,
            amount_cents=sum(
                t.amount_cents for t in rows if t.type == "expense" and t.category == c
            ),
        )
        for c in CATEGORIES
    ]


def budgets(db, month):
    spending = {r["category"]: r["amount_cents"] for r in categories(db, month)}
    return [
        dict(
            id=b.id,
            month=b.month,
            category=b.category,
            amount_cents=b.amount_cents,
            spent_cents=spending[b.category],
            remaining_cents=b.amount_cents - spending[b.category],
            utilization=round(spending[b.category] / b.amount_cents * 100, 2),
        )
        for b in db.scalars(select(Budget).where(Budget.month == month))
    ]


def summary(db, month):
    start, _ = month_bounds(month)
    previous = date(
        start.year - (start.month == 1), (start.month - 2) % 12 + 1, 1
    ).strftime("%Y-%m")
    rows = month_transactions(db, month)
    expenses = sum(t.amount_cents for t in rows if t.type == "expense")
    income = sum(t.amount_cents for t in rows if t.type == "income")
    prior = sum(
        t.amount_cents for t in month_transactions(db, previous) if t.type == "expense"
    )
    limits = budgets(db, month)
    total_budget = sum(b["amount_cents"] for b in limits)
    used = sum(b["spent_cents"] for b in limits)
    days = (
        min(date.today().day, calendar.monthrange(start.year, start.month)[1])
        if month == date.today().strftime("%Y-%m")
        else calendar.monthrange(start.year, start.month)[1]
    )
    return dict(
        expenses_cents=expenses,
        income_cents=income,
        net_cents=income - expenses,
        budget_cents=total_budget,
        budget_spent_cents=used,
        budget_utilization=round(used / total_budget * 100, 2) if total_budget else 0,
        change_percent=round((expenses - prior) / prior * 100, 2) if prior else None,
        daily_average_cents=round(expenses / days),
        largest_category=(
            max(categories(db, month), key=lambda c: c["amount_cents"])["category"]
            if expenses
            else None
        ),
    )


DEFINITIONS = [
    ("first", "First Step", "Add your first transaction.", 50),
    ("organized", "Organized Mind", "Categorize 10 transactions outside Other.", 100),
    ("planner", "Budget Planner", "Create a monthly budget.", 75),
    (
        "explorer",
        "Data Explorer",
        "Import a CSV with at least one new transaction.",
        100,
    ),
    ("consistent", "Consistent Tracker", "Record expenses on 3 distinct dates.", 100),
    (
        "saver",
        "Smart Saver",
        "Complete a past month with spending and stay within every configured category budget.",
        150,
    ),
]


def achievements(db):
    rows = db.scalars(select(Transaction)).all()
    limits = db.scalars(select(Budget)).all()
    past_months = {b.month for b in limits if b.month < date.today().strftime("%Y-%m")}
    saved = any(
        any(t.type == "expense" for t in month_transactions(db, m))
        and all(b["spent_cents"] <= b["amount_cents"] for b in budgets(db, m))
        for m in past_months
    )
    conditions = [
        bool(rows),
        sum(t.category != "Other" for t in rows) >= 10,
        bool(limits),
        db.scalar(select(ImportRecord.id).limit(1)) is not None,
        len({t.date for t in rows if t.type == "expense"}) >= 3,
        saved,
    ]
    # A write lock acquired by callers serializes condition evaluation and awards.
    existing = {a.key: a for a in db.scalars(select(Achievement))}
    for (key, _, _, xp), condition in zip(DEFINITIONS, conditions):
        if condition and key not in existing:
            record = Achievement(key=key, xp=xp)
            db.add(record)
            existing[key] = record
    db.flush()
    xp = sum(a.xp for a in existing.values())
    return dict(
        xp=xp,
        level=xp // 200 + 1,
        next_level_xp=200 - xp % 200,
        achievements=[
            dict(
                key=k,
                title=title,
                description=desc,
                xp=points,
                unlocked=k in existing,
                earned_at=existing[k].earned_at if k in existing else None,
            )
            for k, title, desc, points in DEFINITIONS
        ],
    )


def preview_csv(db, content):
    # Check row widths before Pandas can infer an index from surplus CSV fields.
    # Keep invalid rows in the preview rather than silently skipping them.
    try:
        reader = csv.reader(io.StringIO(content.lstrip("\ufeff")), strict=True)
        header = next(reader)
        records = []
        while True:
            line = reader.line_num + 1
            try:
                fields = next(reader)
            except StopIteration:
                break
            if fields:
                records.append((line, fields))
            if len(records) > 5000:
                raise ValueError("Maximum 5,000 rows per import.")
    except (csv.Error, StopIteration) as exc:
        raise ValueError(
            "Could not parse CSV. Use the documented comma-separated schema."
        ) from exc
    if len(set(header)) != len(header):
        raise ValueError("CSV column names must be unique.")
    if not {"date", "description", "amount", "type"}.issubset(header):
        raise ValueError("Required columns: date, description, amount, type.")
    frame = pd.DataFrame.from_records(
        [dict(zip(header, fields)) for _, fields in records], columns=header
    ).fillna("")
    seen = set(db.scalars(select(Transaction.fingerprint)))
    result = []
    for index, row in frame.iterrows():
        line, fields = records[index]
        raw = {
            k: v for k, v in row.to_dict().items() if k in TransactionIn.model_fields
        }
        if raw.get("category") == "":
            raw["category"] = None
        try:
            if len(fields) != len(header):
                raise ValueError("Incorrect number of fields")
            data = TransactionIn.model_validate(raw)
            key = fingerprint(data)
            duplicate = key in seen
            result.append(
                dict(
                    row=line,
                    status="duplicate" if duplicate else "valid",
                    data=data.model_dump(mode="json"),
                    error=None,
                )
            )
            seen.add(key)
        except (ValueError, TypeError):
            result.append(
                dict(
                    row=line,
                    status="invalid",
                    data=raw,
                    error=(
                        f"Expected {len(header)} fields; found {len(fields)}."
                        if len(fields) != len(header)
                        else "Check date (YYYY-MM-DD), nonblank description, positive amount (up to 2 decimals), type and category."
                    ),
                )
            )
    return result
