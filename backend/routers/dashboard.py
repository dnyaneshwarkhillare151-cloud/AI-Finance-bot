from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from database import models
from services.analytics_service import get_dashboard_data
from security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    data = get_dashboard_data(db, current_user.id)
    return {
        "user": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "currency": current_user.currency,
        },
        **data
    }
