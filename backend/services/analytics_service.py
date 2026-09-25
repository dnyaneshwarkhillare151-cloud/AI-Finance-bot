"""
Analytics Service - Pure data analytics without AI dependency.
Provides statistics, trends, and calculations from database data.
"""
from datetime import datetime, timedelta
from collections import defaultdict
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import models


def get_monthly_summary(db: Session, user_id: int, month: int, year: int) -> dict:
    """Get income/expense summary for a specific month."""
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id,
        extract("month", models.Transaction.date) == month,
        extract("year", models.Transaction.date) == year
    ).all()

    income = sum(t.amount for t in transactions if t.type == models.TransactionType.income)
    expense = sum(t.amount for t in transactions if t.type == models.TransactionType.expense)
    savings = income - expense

    category_spending = defaultdict(float)
    for t in transactions:
        if t.type == models.TransactionType.expense:
            category_spending[t.category.value] += t.amount

    return {
        "month": month,
        "year": year,
        "total_income": round(income, 2),
        "total_expense": round(expense, 2),
        "savings": round(savings, 2),
        "savings_rate": round((savings / income * 100) if income > 0 else 0, 1),
        "transaction_count": len(transactions),
        "category_spending": dict(category_spending),
        "top_category": max(category_spending, key=category_spending.get) if category_spending else None,
    }


def get_monthly_trend(db: Session, user_id: int, months: int = 6) -> List[dict]:
    """Get monthly trend for the last N months."""
    now = datetime.now()
    trend = []
    for i in range(months - 1, -1, -1):
        target = now - timedelta(days=i * 30)
        summary = get_monthly_summary(db, user_id, target.month, target.year)
        summary["month_label"] = target.strftime("%b %Y")
        trend.append(summary)
    return trend


def get_category_spending(db: Session, user_id: int, month: int, year: int) -> Dict[str, float]:
    """Get spending by category for a month."""
    result = db.query(
        models.Transaction.category,
        func.sum(models.Transaction.amount).label("total")
    ).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == models.TransactionType.expense,
        extract("month", models.Transaction.date) == month,
        extract("year", models.Transaction.date) == year
    ).group_by(models.Transaction.category).all()

    return {row.category.value: round(row.total, 2) for row in result}


def get_budgets_with_spending(db: Session, user_id: int, month: int, year: int) -> List[dict]:
    """Get budgets with current spending and status."""
    budgets = db.query(models.Budget).filter(
        models.Budget.user_id == user_id,
        models.Budget.month == month,
        models.Budget.year == year
    ).all()

    category_spending = get_category_spending(db, user_id, month, year)
    result = []

    for budget in budgets:
        spent = category_spending.get(budget.category.value, 0)
        remaining = max(0, budget.limit_amount - spent)
        pct = (spent / budget.limit_amount * 100) if budget.limit_amount > 0 else 0

        if pct >= 90:
            status = "critical"
        elif pct >= 70:
            status = "warning"
        else:
            status = "normal"

        result.append({
            "id": budget.id,
            "category": budget.category.value,
            "limit_amount": budget.limit_amount,
            "spent": round(spent, 2),
            "remaining": round(remaining, 2),
            "percentage_used": round(pct, 1),
            "status": status,
            "month": month,
            "year": year,
            "created_at": budget.created_at,
        })

    return result


def get_goals_with_progress(db: Session, user_id: int) -> List[dict]:
    """Get goals with progress percentage."""
    goals = db.query(models.Goal).filter(
        models.Goal.user_id == user_id
    ).order_by(models.Goal.priority.desc()).all()

    result = []
    for goal in goals:
        progress = (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
        result.append({
            "id": goal.id,
            "name": goal.name,
            "target_amount": goal.target_amount,
            "current_amount": goal.current_amount,
            "target_date": goal.target_date,
            "priority": goal.priority.value,
            "description": goal.description,
            "is_completed": goal.is_completed,
            "progress_percentage": round(min(100, progress), 1),
            "created_at": goal.created_at,
        })
    return result


def get_dashboard_data(db: Session, user_id: int) -> dict:
    """Aggregate all dashboard data."""
    now = datetime.now()
    month, year = now.month, now.year

    # Current month
    current = get_monthly_summary(db, user_id, month, year)
    # Previous month
    prev_date = now - timedelta(days=30)
    previous = get_monthly_summary(db, user_id, prev_date.month, prev_date.year)

    # 6-month trend
    trend = get_monthly_trend(db, user_id, 6)

    # All-time totals
    all_income = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == models.TransactionType.income
    ).scalar() or 0

    all_expense = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == models.TransactionType.expense
    ).scalar() or 0

    # Budgets
    budgets = get_budgets_with_spending(db, user_id, month, year)

    # Goals
    goals = get_goals_with_progress(db, user_id)
    active_goals = [g for g in goals if not g["is_completed"]]

    # Recent transactions
    recent_txns = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id
    ).order_by(models.Transaction.date.desc()).limit(5).all()

    # Unread notifications count
    unread_count = db.query(func.count(models.Notification.id)).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False
    ).scalar() or 0

    return {
        "current_month": current,
        "previous_month": previous,
        "all_time": {
            "total_income": round(all_income, 2),
            "total_expense": round(all_expense, 2),
            "net_savings": round(all_income - all_expense, 2),
        },
        "monthly_trend": trend,
        "budgets": budgets,
        "goals": active_goals[:4],
        "recent_transactions": [
            {
                "id": t.id,
                "amount": t.amount,
                "type": t.type.value,
                "category": t.category.value,
                "description": t.description,
                "date": t.date,
                "payment_method": t.payment_method.value,
            }
            for t in recent_txns
        ],
        "unread_notifications": unread_count,
        "category_spending": current["category_spending"],
    }


def detect_anomalies(db: Session, user_id: int) -> List[dict]:
    """Detect unusual spending patterns using statistical analysis (DB-agnostic)."""
    now = datetime.now()
    anomalies = []

    # Get last 3 months expense transactions (excluding the last 7 days)
    three_months_ago = now - timedelta(days=90)
    seven_days_ago = now - timedelta(days=7)
    
    historical_txns = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == models.TransactionType.expense,
        models.Transaction.date >= three_months_ago,
        models.Transaction.date < seven_days_ago
    ).all()

    # Calculate average amount per category in Python
    category_amounts = defaultdict(list)
    for txn in historical_txns:
        category_amounts[txn.category.value].append(txn.amount)

    avg_by_cat = {}
    for cat, amounts in category_amounts.items():
        if amounts:
            avg_val = sum(amounts) / len(amounts)
            avg_by_cat[cat] = {"avg": avg_val, "count": len(amounts)}

    # Get last 7 days transactions
    recent = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == models.TransactionType.expense,
        models.Transaction.date >= seven_days_ago
    ).all()

    for txn in recent:
        cat = txn.category.value
        if cat in avg_by_cat:
            stats = avg_by_cat[cat]
            if stats["avg"] > 0 and txn.amount > stats["avg"] * 2.5:
                multiplier = round(txn.amount / stats["avg"], 1)
                anomalies.append({
                    "transaction_id": txn.id,
                    "category": cat,
                    "amount": txn.amount,
                    "average_amount": round(stats["avg"], 2),
                    "description": txn.description,
                    "date": txn.date.isoformat() if hasattr(txn.date, "isoformat") else str(txn.date),
                    "multiplier": multiplier,
                    "message": f"Unusual {cat} spending of ₹{txn.amount:,.0f} detected — {multiplier}x your historical average of ₹{stats['avg']:,.0f}",
                    "severity": "high" if txn.amount > stats["avg"] * 5 else "medium"
                })

    return anomalies


def get_average_category_spending(db: Session, user_id: int, months: int = 3) -> Dict[str, float]:
    """Get average monthly spending per category over last N months."""
    since = datetime.now() - timedelta(days=months * 30)
    result = db.query(
        models.Transaction.category,
        func.sum(models.Transaction.amount).label("total")
    ).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == models.TransactionType.expense,
        models.Transaction.date >= since
    ).group_by(models.Transaction.category).all()

    return {row.category.value: round(row.total / max(1, months), 2) for row in result}


def get_report_data(db: Session, user_id: int, period: str, month: int = None, year: int = None) -> dict:
    """Get comprehensive Financial Statement data for report generation."""
    now = datetime.now()
    if not month:
        month = now.month
    if not year:
        year = now.year

    if period == "monthly":
        transactions = db.query(models.Transaction).filter(
            models.Transaction.user_id == user_id,
            extract("month", models.Transaction.date) == month,
            extract("year", models.Transaction.date) == year
        ).order_by(models.Transaction.date.desc()).all()
    elif period == "yearly":
        transactions = db.query(models.Transaction).filter(
            models.Transaction.user_id == user_id,
            extract("year", models.Transaction.date) == year
        ).order_by(models.Transaction.date.desc()).all()
    else:
        transactions = db.query(models.Transaction).filter(
            models.Transaction.user_id == user_id
        ).order_by(models.Transaction.date.desc()).limit(200).all()

    income = sum(t.amount for t in transactions if t.type == models.TransactionType.income)
    expense = sum(t.amount for t in transactions if t.type == models.TransactionType.expense)
    savings = income - expense
    savings_rate = round((savings / income * 100) if income > 0 else 0, 1)

    # Income breakdown by source/category
    income_breakdown = defaultdict(float)
    for t in transactions:
        if t.type == models.TransactionType.income:
            income_breakdown[t.category.value] += t.amount

    # Expense breakdown by category
    category_breakdown = defaultdict(float)
    for t in transactions:
        if t.type == models.TransactionType.expense:
            category_breakdown[t.category.value] += t.amount

    top_category = max(category_breakdown, key=category_breakdown.get) if category_breakdown else "None"

    # Budget Variance calculation
    budget_variance = []
    budgets_query = db.query(models.Budget).filter(models.Budget.user_id == user_id)
    if period == "monthly":
        budgets_query = budgets_query.filter(models.Budget.month == month, models.Budget.year == year)
    elif period == "yearly":
        budgets_query = budgets_query.filter(models.Budget.year == year)
    
    budgets = budgets_query.all()
    for b in budgets:
        spent = category_breakdown.get(b.category.value, 0.0)
        variance = round(b.limit_amount - spent, 2)
        pct_used = round((spent / b.limit_amount * 100) if b.limit_amount > 0 else 0, 1)
        if pct_used >= 95:
            b_status = "critical"
        elif pct_used >= 75:
            b_status = "warning"
        else:
            b_status = "normal"

        budget_variance.append({
            "category": b.category.value,
            "limit": b.limit_amount,
            "spent": round(spent, 2),
            "variance": variance,
            "percentage_used": pct_used,
            "status": b_status,
        })

    return {
        "period": period,
        "month": month,
        "year": year,
        "total_income": round(income, 2),
        "total_expense": round(expense, 2),
        "net_savings": round(savings, 2),
        "savings_rate": savings_rate,
        "top_category": top_category,
        "income_breakdown": dict(income_breakdown),
        "category_breakdown": dict(category_breakdown),
        "budget_variance": budget_variance,
        "transaction_count": len(transactions),
        "transactions": [
            {
                "id": t.id,
                "amount": t.amount,
                "type": t.type.value,
                "category": t.category.value,
                "description": t.description,
                "date": t.date.isoformat() if hasattr(t.date, "isoformat") else str(t.date),
                "payment_method": t.payment_method.value,
            }
            for t in transactions
        ]
    }
