from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from database.connection import get_db
from database import models
from schemas.finance import BudgetCreate, BudgetUpdate
from services.analytics_service import get_budgets_with_spending, get_average_category_spending
from services.ai_service import generate_budget_recommendations
from security import get_current_user

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])


@router.get("")
def get_budgets(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    now = datetime.now()
    m = month or now.month
    y = year or now.year
    budgets = get_budgets_with_spending(db, current_user.id, m, y)
    return {"budgets": budgets, "month": m, "year": y}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_budget(
    data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if budget already exists for this category/month/year
    existing = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.category == data.category,
        models.Budget.month == data.month,
        models.Budget.year == data.year,
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Budget for {data.category.value} in {data.month}/{data.year} already exists. Use PUT to update."
        )

    budget = models.Budget(
        user_id=current_user.id,
        category=data.category,
        limit_amount=data.limit_amount,
        month=data.month,
        year=data.year,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return {"message": "Budget created", "id": budget.id, "category": budget.category.value, "limit_amount": budget.limit_amount}


@router.put("/{budget_id}")
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found.")
    if data.limit_amount is not None:
        budget.limit_amount = data.limit_amount
    db.commit()
    return {"message": "Budget updated successfully"}


@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found.")
    db.delete(budget)
    db.commit()
    return {"message": "Budget deleted successfully"}


@router.get("/recommendations")
def get_budget_recommendations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """AI-powered budget recommendations based on spending history."""
    avg_spending = get_average_category_spending(db, current_user.id, months=3)
    now = datetime.now()
    from services.analytics_service import get_monthly_summary
    curr_summary = get_monthly_summary(db, current_user.id, now.month, now.year)
    income = current_user.monthly_income_target or curr_summary.get("total_income") or 50000.0
    recommendations = generate_budget_recommendations(avg_spending, income)
    return {"recommendations": recommendations, "based_on": "3-month spending average", "income_basis": income}
