from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.connection import get_db
from database import models
from schemas.finance import GoalCreate, GoalUpdate
from services.analytics_service import get_goals_with_progress, get_monthly_summary
from services.ai_service import analyze_goal
from security import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/goals", tags=["Goals"])


@router.get("")
def get_goals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    goals = get_goals_with_progress(db, current_user.id)
    return {"goals": goals}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_goal(
    data: GoalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    goal = models.Goal(
        user_id=current_user.id,
        name=data.name,
        target_amount=data.target_amount,
        current_amount=data.current_amount,
        target_date=data.target_date,
        priority=data.priority,
        description=data.description,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return {"message": "Goal created", "id": goal.id, "name": goal.name}


@router.put("/{goal_id}")
def update_goal(
    goal_id: int,
    data: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found.")

    update_fields = data.dict(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(goal, field, value)

    # Auto-complete if target reached
    if goal.current_amount >= goal.target_amount:
        goal.is_completed = True
        # Create milestone notification
        notif = models.Notification(
            user_id=current_user.id,
            type=models.NotificationType.savings_milestone,
            title=f"Goal Achieved! 🎉 - {goal.name}",
            message=f"Congratulations! You've achieved your '{goal.name}' goal of ₹{goal.target_amount:,.0f}!",
            is_read=False
        )
        db.add(notif)

    db.commit()
    db.refresh(goal)
    return {"message": "Goal updated successfully", "is_completed": goal.is_completed}


@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found.")
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted successfully"}


@router.get("/{goal_id}/analysis")
def get_goal_analysis(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """AI analysis for a specific goal."""
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found.")

    now = datetime.now()
    current_month_data = get_monthly_summary(db, current_user.id, now.month, now.year)
    monthly_savings = current_month_data.get("savings", 0)

    goal_dict = {
        "name": goal.name,
        "target_amount": goal.target_amount,
        "current_amount": goal.current_amount,
        "target_date": goal.target_date,
        "priority": goal.priority.value,
    }

    analysis = analyze_goal(goal_dict, monthly_savings)
    return {"goal": goal_dict, "analysis": analysis}
