from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from database.connection import get_db
from database import models
from services.ai_service import (
    categorize_transaction,
    chat_with_advisor,
    generate_insights,
    calculate_financial_health,
    GEMINI_AVAILABLE
)
from services.rag_service import rag_query
from services.analytics_service import (
    get_dashboard_data,
    get_monthly_summary,
    get_category_spending,
    detect_anomalies,
    get_average_category_spending,
    get_budgets_with_spending,
    get_goals_with_progress
)
from security import get_current_user
from config import GEMINI_API_KEY

router = APIRouter(prefix="/api/ai", tags=["AI"])


class CategorizeRequest(BaseModel):
    description: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    use_rag: bool = False


@router.get("/status")
def get_ai_status():
    return {
        "gemini_available": GEMINI_AVAILABLE,
        "api_key_configured": bool(GEMINI_API_KEY),
        "features": {
            "categorization": True,
            "chat": GEMINI_AVAILABLE,
            "rag": True,
            "insights": True,
            "health_analysis": True,
            "anomaly_detection": True,
        }
    }


@router.post("/categorize")
def categorize(
    req: CategorizeRequest,
    current_user: models.User = Depends(get_current_user)
):
    if not req.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")
    result = categorize_transaction(req.description)
    return result


@router.post("/chat")
def ai_chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    now = datetime.now()

    # Build financial context from DB
    monthly = get_monthly_summary(db, current_user.id, now.month, now.year)
    budgets = get_budgets_with_spending(db, current_user.id, now.month, now.year)
    goals = get_goals_with_progress(db, current_user.id)
    cat_spending = get_category_spending(db, current_user.id, now.month, now.year)

    financial_context = {
        "user_name": current_user.full_name,
        "current_month": now.strftime("%B %Y"),
        "monthly_income": monthly.get("total_income", 0),
        "monthly_expense": monthly.get("total_expense", 0),
        "monthly_savings": monthly.get("savings", 0),
        "savings_rate": monthly.get("savings_rate", 0),
        "category_spending": cat_spending,
        "active_budgets": [
            {"category": b["category"], "limit": b["limit_amount"], "spent": b["spent"], "pct": b["percentage_used"]}
            for b in budgets[:5]
        ],
        "active_goals": [
            {"name": g["name"], "target": g["target_amount"], "current": g["current_amount"], "progress": g["progress_percentage"]}
            for g in goals[:4] if not g["is_completed"]
        ],
    }

    if req.use_rag:
        result = rag_query(req.message, financial_context)
    else:
        history = [{"role": m.role, "content": m.content} for m in (req.history or [])]
        result = chat_with_advisor(req.message, financial_context, history)

    return result


@router.get("/insights")
def get_ai_insights(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    now = datetime.now()
    dashboard_data = get_dashboard_data(db, current_user.id)
    budgets = get_budgets_with_spending(db, current_user.id, now.month, now.year)

    financial_data = {
        "monthly_comparison": {
            "current_month": dashboard_data["current_month"],
            "previous_month": dashboard_data["previous_month"],
        },
        "category_spending": dashboard_data["category_spending"],
        "budgets": budgets,
        "savings_rate": dashboard_data["current_month"].get("savings_rate", 0),
        "goals": dashboard_data["goals"],
    }

    insights = generate_insights(financial_data)
    anomalies = detect_anomalies(db, current_user.id)

    return {
        "insights": insights,
        "anomalies": anomalies,
        "generated_at": now.isoformat(),
        "is_ai_enhanced": GEMINI_AVAILABLE,
    }


@router.get("/financial-health")
def get_financial_health(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    now = datetime.now()
    monthly = get_monthly_summary(db, current_user.id, now.month, now.year)
    budgets = get_budgets_with_spending(db, current_user.id, now.month, now.year)
    goals = get_goals_with_progress(db, current_user.id)

    data = {
        "total_income": monthly.get("total_income", 0),
        "total_expense": monthly.get("total_expense", 0),
        "budgets": budgets,
        "goals": goals,
    }

    health = calculate_financial_health(data)

    # Update profile
    profile = db.query(models.FinancialProfile).filter(
        models.FinancialProfile.user_id == current_user.id
    ).first()
    if profile:
        profile.health_score = health["health_score"]
        profile.savings_rate = health["savings_rate"]
        profile.expense_ratio = health["expense_ratio"]
        profile.budget_adherence = health["budget_adherence"]
        profile.goal_progress = health["goal_progress"]
        from sqlalchemy.sql import func
        profile.last_calculated = func.now()
        db.commit()

    return health


@router.get("/anomalies")
def get_anomalies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    anomalies = detect_anomalies(db, current_user.id)
    return {"anomalies": anomalies, "count": len(anomalies)}


@router.post("/rag")
def rag_search(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """RAG-based knowledge retrieval."""
    now = datetime.now()
    monthly = get_monthly_summary(db, current_user.id, now.month, now.year)
    context = {
        "monthly_income": monthly.get("total_income", 0),
        "monthly_expense": monthly.get("total_expense", 0),
        "savings_rate": monthly.get("savings_rate", 0),
    }
    result = rag_query(req.message, context)
    return result
