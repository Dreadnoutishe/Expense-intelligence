from datetime import datetime, timezone, date
from sqlalchemy import (
    String,
    Integer,
    Date,
    DateTime,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (CheckConstraint("amount_cents > 0"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    description: Mapped[str] = mapped_column(String(200))
    merchant: Mapped[str] = mapped_column(String(120), default="")
    amount_cents: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String(10))
    category: Mapped[str] = mapped_column(String(30))
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint("month", "category"),
        CheckConstraint("amount_cents > 0"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    month: Mapped[str] = mapped_column(String(7))
    category: Mapped[str] = mapped_column(String(30))
    amount_cents: Mapped[int] = mapped_column(Integer)


class Achievement(Base):
    __tablename__ = "achievements"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    xp: Mapped[int] = mapped_column(Integer)
    earned_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class ImportRecord(Base):
    __tablename__ = "imports"
    id: Mapped[int] = mapped_column(primary_key=True)
    count: Mapped[int] = mapped_column(Integer)
