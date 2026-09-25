from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from database.connection import get_db
from database import models
from services.analytics_service import get_report_data
from services.ai_service import generate_report_summary
from security import get_current_user
import csv
import io
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("")
def get_report(
    period: str = Query("monthly", regex="^(monthly|yearly|all)$"),
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    data = get_report_data(db, current_user.id, period, month, year)
    ai_summary = generate_report_summary(data)
    return {
        "report": data,
        "ai_summary": ai_summary,
        "generated_at": datetime.now().isoformat(),
    }


@router.get("/export/csv")
def export_csv(
    period: str = Query("monthly", regex="^(monthly|yearly|all)$"),
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Export financial statement and transactions as CSV."""
    data = get_report_data(db, current_user.id, period, month, year)
    transactions = data.get("transactions", [])

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Financial Statement Header
    writer.writerow(["FINANCIAL STATEMENT & TRANSACTION LEDGER"])
    writer.writerow(["User", current_user.full_name, "Email", current_user.email])
    writer.writerow(["Period", period.capitalize(), "Month/Year", f"{data.get('month')}/{data.get('year')}"])
    writer.writerow(["Generated On", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow([])
    
    # Statement Summary
    writer.writerow(["STATEMENT SUMMARY"])
    writer.writerow(["Total Income (INR)", data.get("total_income", 0)])
    writer.writerow(["Total Expenses (INR)", data.get("total_expense", 0)])
    writer.writerow(["Net Savings (INR)", data.get("net_savings", 0)])
    writer.writerow(["Savings Rate (%)", f"{data.get('savings_rate', 0)}%"])
    writer.writerow(["Top Spending Category", data.get("top_category", "None")])
    writer.writerow([])

    # Category Breakdown
    writer.writerow(["EXPENSE BREAKDOWN BY CATEGORY"])
    writer.writerow(["Category", "Amount (INR)"])
    for cat, amt in data.get("category_breakdown", {}).items():
        writer.writerow([cat, amt])
    writer.writerow([])

    # Budget Variance
    writer.writerow(["BUDGET VARIANCE"])
    writer.writerow(["Category", "Budget Limit (INR)", "Actual Spent (INR)", "Variance (INR)", "Usage (%)", "Status"])
    for b in data.get("budget_variance", []):
        writer.writerow([b["category"], b["limit"], b["spent"], b["variance"], f"{b['percentage_used']}%", b["status"].upper()])
    writer.writerow([])

    # Transaction Ledger
    writer.writerow(["TRANSACTION LEDGER"])
    dict_writer = csv.DictWriter(
        output,
        fieldnames=["id", "date", "description", "type", "category", "amount", "payment_method"]
    )
    dict_writer.writeheader()
    for t in transactions:
        dict_writer.writerow({
            "id": t["id"],
            "date": t["date"],
            "description": t["description"],
            "type": t["type"],
            "category": t["category"],
            "amount": t["amount"],
            "payment_method": t["payment_method"],
        })

    output.seek(0)
    filename = f"financial_statement_{period}_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
