from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str

    @validator("full_name")
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip()

    @validator("password")
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "password" in values and v != values["password"]:
            raise ValueError("Passwords do not match")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    monthly_income_target: Optional[float] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    currency: str
    monthly_income_target: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
