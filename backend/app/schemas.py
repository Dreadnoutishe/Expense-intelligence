from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field, field_validator

Category = Literal[
    "Food",
    "Transport",
    "Shopping",
    "Entertainment",
    "Bills",
    "Health",
    "Education",
    "Other",
]


class TransactionIn(BaseModel):
    date: date
    description: str = Field(min_length=1, max_length=200)
    merchant: str = Field(default="", max_length=120)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    type: Literal["income", "expense"] = "expense"
    category: Category | None = None

    @field_validator("description", "merchant", mode="before")
    @classmethod
    def strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class TransactionOut(BaseModel):
    id: int
    date: date
    description: str
    merchant: str
    amount: Decimal
    type: str
    category: str
    created_at: datetime


class BudgetIn(BaseModel):
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    category: Category
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)

    @field_validator("month")
    @classmethod
    def valid_month(cls, value):
        date.fromisoformat(value + "-01")
        return value


class ImportConfirm(BaseModel):
    csv: str = Field(max_length=2_000_000)


class CategoryTotal(BaseModel):
    category: str
    amount_cents: int


class SummaryOut(BaseModel):
    expenses_cents: int
    income_cents: int
    net_cents: int
    budget_cents: int
    budget_spent_cents: int
    budget_utilization: float
    change_percent: float | None
    daily_average_cents: int
    largest_category: str | None


class TrendOut(BaseModel):
    month: str
    expenses_cents: int
    income_cents: int


class BudgetOut(BaseModel):
    id: int
    month: str
    category: str
    amount_cents: int
    spent_cents: int
    remaining_cents: int
    utilization: float


class AchievementOut(BaseModel):
    key: str
    title: str
    description: str
    xp: int
    unlocked: bool
    earned_at: datetime | None


class ProgressOut(BaseModel):
    xp: int
    level: int
    next_level_xp: int
    achievements: list[AchievementOut]


class ImportRow(BaseModel):
    row: int
    status: Literal["valid", "duplicate", "invalid"]
    data: dict
    error: str | None


class PreviewOut(BaseModel):
    csv: str
    rows: list[ImportRow]


class ImportOut(BaseModel):
    imported: int
    skipped: int
    rejected: int
