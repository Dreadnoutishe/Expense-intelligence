from datetime import date
from typing import Annotated, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, Response
from sqlalchemy import select, or_, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from .database import get_db
from .models import Transaction, Budget, ImportRecord
from .schemas import TransactionIn, TransactionOut, BudgetIn, ImportConfirm, Category
from .schemas import (
    SummaryOut,
    CategoryTotal,
    TrendOut,
    BudgetOut,
    ProgressOut,
    PreviewOut,
    ImportOut,
)
from . import services as s

router = APIRouter(prefix="/api")
DB = Annotated[Session, Depends(get_db)]
Month = Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]


def valid_month(month):
    try:
        s.month_bounds(month)
    except ValueError:
        raise HTTPException(422, "Invalid calendar month")
    return month


def lock(db):
    db.execute(text("BEGIN IMMEDIATE"))


def finish(db):
    s.achievements(db)
    db.commit()


def get_record(db, model, id):
    record = db.get(model, id)
    if record is None:
        raise HTTPException(404, "Record not found")
    return record


@router.get("/transactions", response_model=list[TransactionOut])
def transactions(
    db: DB,
    search: str = "",
    category: Category | None = None,
    start: date | None = None,
    end: date | None = None,
    sort: Literal["date_desc", "date_asc", "amount_desc", "amount_asc"] = "date_desc",
):
    if start and end and start > end:
        raise HTTPException(422, "Start date must precede end date")
    query = select(Transaction)
    if search:
        query = query.where(
            or_(
                Transaction.description.icontains(search, autoescape=True),
                Transaction.merchant.icontains(search, autoescape=True),
            )
        )
    if category:
        query = query.where(Transaction.category == category)
    if start:
        query = query.where(Transaction.date >= start)
    if end:
        query = query.where(Transaction.date <= end)
    column = Transaction.amount_cents if sort.startswith("amount") else Transaction.date
    query = query.order_by(
        column.desc() if sort.endswith("desc") else column.asc(), Transaction.id.desc()
    )
    return [s.serialize(t) for t in db.scalars(query)]


@router.post("/transactions", status_code=201, response_model=TransactionOut)
def create_transaction(data: TransactionIn, db: DB):
    lock(db)
    transaction = Transaction(**s.transaction_values(data))
    db.add(transaction)
    try:
        finish(db)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "A transaction with these normalized details already exists."
        )
    return s.serialize(transaction)


@router.put("/transactions/{id}", response_model=TransactionOut)
def update_transaction(id: int, data: TransactionIn, db: DB):
    lock(db)
    transaction = get_record(db, Transaction, id)
    for key, value in s.transaction_values(data).items():
        setattr(transaction, key, value)
    try:
        finish(db)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A transaction with these details already exists.")
    return s.serialize(transaction)


@router.delete("/transactions/{id}", status_code=204)
def delete_transaction(id: int, db: DB):
    lock(db)
    db.delete(get_record(db, Transaction, id))
    db.commit()
    return Response(status_code=204)


@router.post("/transactions/import/preview", response_model=PreviewOut)
async def import_preview(file: UploadFile, db: DB):
    content = await file.read(2_000_001)
    if len(content) > 2_000_000:
        raise HTTPException(413, "CSV must be smaller than 2 MB.")
    try:
        csv = content.decode("utf-8-sig")
        rows = s.preview_csv(db, csv)
    except (ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(422, str(exc))
    return dict(csv=csv, rows=rows)


@router.post("/transactions/import/confirm", response_model=ImportOut)
def import_confirm(data: ImportConfirm, db: DB):
    lock(db)
    try:
        rows = s.preview_csv(db, data.csv)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    imported = 0
    for row in rows:
        if row["status"] == "valid":
            db.add(
                Transaction(
                    **s.transaction_values(TransactionIn.model_validate(row["data"]))
                )
            )
            imported += 1
    if imported:
        db.add(ImportRecord(count=imported))
    finish(db)
    return dict(
        imported=imported,
        skipped=sum(r["status"] == "duplicate" for r in rows),
        rejected=sum(r["status"] == "invalid" for r in rows),
    )


@router.get("/analytics/summary", response_model=SummaryOut)
def summary(db: DB, month: Month):
    return s.summary(db, valid_month(month))


@router.get("/analytics/categories", response_model=list[CategoryTotal])
def categories(db: DB, month: Month):
    return s.categories(db, valid_month(month))


@router.get("/analytics/trends", response_model=list[TrendOut])
def trends(db: DB, month: Month):
    start, _ = s.month_bounds(valid_month(month))
    result = []
    for offset in range(5, -1, -1):
        index = start.year * 12 + start.month - 1 - offset
        label = f"{index//12:04}-{index%12+1:02}"
        totals = s.summary(db, label)
        result.append(
            dict(
                month=label,
                expenses_cents=totals["expenses_cents"],
                income_cents=totals["income_cents"],
            )
        )
    return result


@router.get("/budgets", response_model=list[BudgetOut])
def budgets(db: DB, month: Month):
    return s.budgets(db, valid_month(month))


@router.post("/budgets", status_code=201, response_model=BudgetOut)
def create_budget(data: BudgetIn, db: DB):
    lock(db)
    budget = Budget(
        month=data.month, category=data.category, amount_cents=int(data.amount * 100)
    )
    db.add(budget)
    try:
        finish(db)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "A budget already exists for this category and month. Edit it instead."
        )
    return next(b for b in s.budgets(db, data.month) if b["id"] == budget.id)


@router.put("/budgets/{id}", response_model=BudgetOut)
def update_budget(id: int, data: BudgetIn, db: DB):
    lock(db)
    budget = get_record(db, Budget, id)
    budget.month, budget.category, budget.amount_cents = (
        data.month,
        data.category,
        int(data.amount * 100),
    )
    try:
        finish(db)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A budget already exists for this category and month.")
    return next(b for b in s.budgets(db, data.month) if b["id"] == id)


@router.get("/achievements", response_model=ProgressOut)
def achievements(db: DB):
    lock(db)
    result = s.achievements(db)
    db.commit()
    return result
