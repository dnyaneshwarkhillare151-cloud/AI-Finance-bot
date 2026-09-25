from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
from database.models import TransactionType, TransactionCategory, PaymentMethod


class TransactionCreate(BaseModel):
    amount: float
    type: TransactionType
    category: TransactionCategory
    description: str
    date: datetime
    payment_method: PaymentMethod = PaymentMethod.cash
    notes: Optional[str] = None
    is_recurring: bool = False

    @validator("amount")
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return round(v, 2)

    @validator("description")
    def description_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Description cannot be empty")
        return v.strip()


class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    type: Optional[TransactionType] = None
    category: Optional[TransactionCategory] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    payment_method: Optional[PaymentMethod] = None
    notes: Optional[str] = None
    is_recurring: Optional[bool] = None


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    type: str
    category: str
    description: str
    date: datetime
    payment_method: str
    notes: Optional[str]
    ai_categorized: bool
    ai_confidence: Optional[str]
    is_recurring: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionFilter(BaseModel):
    type: Optional[TransactionType] = None
    category: Optional[TransactionCategory] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    search: Optional[str] = None
