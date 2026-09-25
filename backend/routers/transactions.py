from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import datetime
from database.connection import get_db
from database import models
from schemas.transactions import TransactionCreate, TransactionUpdate, TransactionResponse
from security import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


@router.get("")
def get_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("date", regex="^(date|amount|category)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id)

    if type:
        try:
            query = query.filter(models.Transaction.type == models.TransactionType(type))
        except ValueError:
            pass

    if category:
        try:
            query = query.filter(models.Transaction.category == models.TransactionCategory(category))
        except ValueError:
            pass

    if start_date:
        try:
            query = query.filter(models.Transaction.date >= datetime.fromisoformat(start_date))
        except ValueError:
            pass

    if end_date:
        try:
            query = query.filter(models.Transaction.date <= datetime.fromisoformat(end_date))
        except ValueError:
            pass

    if search:
        query = query.filter(
            or_(
                models.Transaction.description.ilike(f"%{search}%"),
                models.Transaction.notes.ilike(f"%{search}%")
            )
        )

    # Sort
    sort_col = getattr(models.Transaction, sort_by, models.Transaction.date)
    if sort_order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    total = query.count()
    transactions = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "transactions": [
            {
                "id": t.id,
                "amount": t.amount,
                "type": t.type.value,
                "category": t.category.value,
                "description": t.description,
                "date": t.date,
                "payment_method": t.payment_method.value,
                "notes": t.notes,
                "ai_categorized": t.ai_categorized,
                "ai_confidence": t.ai_confidence,
                "is_recurring": t.is_recurring,
                "created_at": t.created_at,
            }
            for t in transactions
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    txn = models.Transaction(
        user_id=current_user.id,
        amount=data.amount,
        type=data.type,
        category=data.category,
        description=data.description,
        date=data.date,
        payment_method=data.payment_method,
        notes=data.notes,
        is_recurring=data.is_recurring,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    # Check budget warnings after adding expense
    if txn.type == models.TransactionType.expense:
        _check_and_create_budget_notification(db, current_user.id, txn)

    return {
        "id": txn.id,
        "amount": txn.amount,
        "type": txn.type.value,
        "category": txn.category.value,
        "description": txn.description,
        "date": txn.date,
        "payment_method": txn.payment_method.value,
        "notes": txn.notes,
        "ai_categorized": txn.ai_categorized,
        "ai_confidence": txn.ai_confidence,
        "is_recurring": txn.is_recurring,
        "created_at": txn.created_at,
    }


@router.get("/{transaction_id}")
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    txn = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == current_user.id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return {
        "id": txn.id,
        "amount": txn.amount,
        "type": txn.type.value,
        "category": txn.category.value,
        "description": txn.description,
        "date": txn.date,
        "payment_method": txn.payment_method.value,
        "notes": txn.notes,
        "ai_categorized": txn.ai_categorized,
        "ai_confidence": txn.ai_confidence,
        "is_recurring": txn.is_recurring,
        "created_at": txn.created_at,
    }


@router.put("/{transaction_id}")
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    txn = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == current_user.id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    update_fields = data.dict(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(txn, field, value)

    db.commit()
    db.refresh(txn)
    return {"message": "Transaction updated successfully", "id": txn.id}


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    txn = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == current_user.id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    db.delete(txn)
    db.commit()
    return {"message": "Transaction deleted successfully"}


def _check_and_create_budget_notification(db: Session, user_id: int, txn: models.Transaction):
    """Create notification if budget threshold crossed."""
    from datetime import datetime
    from services.analytics_service import get_budgets_with_spending
    now = datetime.now()
    budgets = get_budgets_with_spending(db, user_id, now.month, now.year)
    for b in budgets:
        if b["category"] == txn.category.value:
            if b["percentage_used"] >= 90:
                notif = models.Notification(
                    user_id=user_id,
                    type=models.NotificationType.budget_exceeded,
                    title=f"{b['category']} Budget Critical",
                    message=f"You've used {b['percentage_used']:.0f}% of your {b['category']} budget. Only ₹{b['remaining']:,.0f} remaining.",
                    is_read=False
                )
                db.add(notif)
                db.commit()
            elif b["percentage_used"] >= 70:
                notif = models.Notification(
                    user_id=user_id,
                    type=models.NotificationType.budget_warning,
                    title=f"{b['category']} Budget Warning",
                    message=f"You've used {b['percentage_used']:.0f}% of your {b['category']} budget. ₹{b['remaining']:,.0f} remaining.",
                    is_read=False
                )
                db.add(notif)
                db.commit()
