from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.connection import get_db
from database import models
from schemas.auth import UserRegister, UserLogin, TokenResponse, UserUpdate, UserResponse
from security import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if email exists
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user = models.User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create financial profile
    profile = models.FinancialProfile(user_id=user.id)
    db.add(profile)
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "currency": user.currency,
            "monthly_income_target": user.monthly_income_target,
        }
    }


@router.post("/login")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials."
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "currency": user.currency,
            "monthly_income_target": user.monthly_income_target,
        }
    }


@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "currency": current_user.currency,
        "monthly_income_target": current_user.monthly_income_target,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
    }


@router.put("/me")
def update_profile(
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if update_data.current_password and update_data.new_password:
        if not verify_password(update_data.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect."
            )
        if len(update_data.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters."
            )
        current_user.hashed_password = get_password_hash(update_data.new_password)

    if update_data.email and update_data.email != current_user.email:
        existing = db.query(models.User).filter(models.User.email == update_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already taken by another account."
            )
        current_user.email = update_data.email

    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name.strip()
    if update_data.monthly_income_target is not None:
        current_user.monthly_income_target = update_data.monthly_income_target
    if update_data.currency is not None:
        current_user.currency = update_data.currency
    elif update_data.currency_symbol is not None:
        current_user.currency = update_data.currency_symbol

    db.commit()
    db.refresh(current_user)
    return {
        "message": "Profile updated successfully",
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "currency": current_user.currency,
        "monthly_income_target": current_user.monthly_income_target,
    }
