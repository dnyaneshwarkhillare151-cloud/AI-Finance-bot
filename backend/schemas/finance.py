from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
from database.models import TransactionCategory, GoalPriority


class BudgetCreate(BaseModel):
    category: TransactionCategory
    limit_amount: float
    month: int
    year: int

    @validator("limit_amount")
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError("Budget limit must be greater than 0")
        return round(v, 2)

    @validator("month")
    def valid_month(cls, v):
        if not 1 <= v <= 12:
            raise ValueError("Month must be between 1 and 12")
        return v


class BudgetUpdate(BaseModel):
    limit_amount: Optional[float] = None


class BudgetResponse(BaseModel):
    id: int
    user_id: int
    category: str
    limit_amount: float
    month: int
    year: int
    spent: float = 0.0
    remaining: float = 0.0
    percentage_used: float = 0.0
    status: str = "normal"
    created_at: datetime

    class Config:
        from_attributes = True


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    target_date: datetime
    priority: GoalPriority = GoalPriority.medium
    description: Optional[str] = None

    @validator("target_amount")
    def target_positive(cls, v):
        if v <= 0:
            raise ValueError("Target amount must be greater than 0")
        return round(v, 2)

    @validator("current_amount")
    def current_non_negative(cls, v):
        if v < 0:
            raise ValueError("Current amount cannot be negative")
        return round(v, 2)

    @validator("name")
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Goal name cannot be empty")
        return v.strip()


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[datetime] = None
    priority: Optional[GoalPriority] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None


class GoalResponse(BaseModel):
    id: int
    user_id: int
    name: str
    target_amount: float
    current_amount: float
    target_date: datetime
    priority: str
    description: Optional[str]
    is_completed: bool
    progress_percentage: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True
