"""Explicit, idempotent demo loader. Never invoked by application startup."""

import argparse
from pathlib import Path
from sqlalchemy import text, select
from app.database import Base, engine, SessionLocal
from app.models import Transaction, ImportRecord, Budget
from app.schemas import TransactionIn
from app.services import preview_csv, transaction_values, achievements


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=None, help="Alternative CSV file")
    args = parser.parse_args()
    source = args.csv or next(
        p
        for p in [
            Path(__file__).parent / "sample_data/demo.csv",
            Path(__file__).parent.parent / "sample_data/demo.csv",
        ]
        if p.exists()
    )
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.execute(text("BEGIN IMMEDIATE"))
        rows = preview_csv(db, source.read_text(encoding="utf-8-sig"))
        imported = 0
        for row in rows:
            if row["status"] == "valid":
                db.add(
                    Transaction(
                        **transaction_values(TransactionIn.model_validate(row["data"]))
                    )
                )
                imported += 1
        if imported:
            db.add(ImportRecord(count=imported))
        month = "2026-11"
        for category, amount in [
            ("Food", 40000),
            ("Transport", 15000),
            ("Bills", 150000),
            ("Entertainment", 10000),
            ("Shopping", 20000),
        ]:
            if not db.scalar(
                select(Budget.id).where(
                    Budget.month == month, Budget.category == category
                )
            ):
                db.add(Budget(month=month, category=category, amount_cents=amount))
        achievements(db)
        db.commit()
        print(
            f'Imported {imported}; skipped {sum(r["status"]=="duplicate" for r in rows)}. Demo dates: September–November 2026. Select November 2026 in the app.'
        )


if __name__ == "__main__":
    main()
