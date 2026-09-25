from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from database.models import (
    User, Transaction, Budget, Goal, Notification, FinancialProfile,
    TransactionType, TransactionCategory, PaymentMethod, GoalPriority, NotificationType
)
from security import get_password_hash


def seed_demo_data(db: Session, user_id: int):
    """Seed realistic demo financial data for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return

    # Clear existing data
    db.query(Transaction).filter(Transaction.user_id == user_id).delete()
    db.query(Budget).filter(Budget.user_id == user_id).delete()
    db.query(Goal).filter(Goal.user_id == user_id).delete()
    db.query(Notification).filter(Notification.user_id == user_id).delete()

    now = datetime.now()
    transactions = []

    # Generate 6 months of transactions
    for month_offset in range(5, -1, -1):
        month_date = now - timedelta(days=month_offset * 30)
        month = month_date.month
        year = month_date.year

        # Salary
        transactions.append(Transaction(
            user_id=user_id,
            amount=75000.0,
            type=TransactionType.income,
            category=TransactionCategory.salary,
            description="Monthly Salary",
            date=datetime(year, month, 1),
            payment_method=PaymentMethod.netbanking,
            notes="Primary income source"
        ))

        # Freelance income (some months)
        if month_offset in [1, 3]:
            transactions.append(Transaction(
                user_id=user_id,
                amount=random.uniform(8000, 15000),
                type=TransactionType.income,
                category=TransactionCategory.other,
                description="Freelance Project Payment",
                date=datetime(year, month, 15),
                payment_method=PaymentMethod.upi
            ))

        # Food expenses
        food_amounts = [random.uniform(400, 800) for _ in range(random.randint(12, 18))]
        for i, amt in enumerate(food_amounts):
            transactions.append(Transaction(
                user_id=user_id,
                amount=round(amt, 2),
                type=TransactionType.expense,
                category=TransactionCategory.food,
                description=random.choice([
                    "Swiggy order", "Zomato delivery", "Groceries - DMart",
                    "Restaurant dinner", "Cafe Coffee Day", "Big Basket order"
                ]),
                date=datetime(year, month, min(i * 2 + 1, 28)),
                payment_method=random.choice([PaymentMethod.upi, PaymentMethod.card])
            ))

        # Transport
        for i in range(random.randint(6, 10)):
            transactions.append(Transaction(
                user_id=user_id,
                amount=round(random.uniform(150, 600), 2),
                type=TransactionType.expense,
                category=TransactionCategory.transport,
                description=random.choice(["Ola ride", "Uber", "Metro card recharge", "Fuel", "Auto"]),
                date=datetime(year, month, min(i * 3 + 1, 28)),
                payment_method=random.choice([PaymentMethod.upi, PaymentMethod.cash])
            ))

        # Bills
        transactions.append(Transaction(
            user_id=user_id,
            amount=1299.0,
            type=TransactionType.expense,
            category=TransactionCategory.bills,
            description="Electricity Bill",
            date=datetime(year, month, 5),
            payment_method=PaymentMethod.upi,
            is_recurring=True
        ))
        transactions.append(Transaction(
            user_id=user_id,
            amount=499.0,
            type=TransactionType.expense,
            category=TransactionCategory.bills,
            description="Internet Bill - Jio Fiber",
            date=datetime(year, month, 10),
            payment_method=PaymentMethod.upi,
            is_recurring=True
        ))
        transactions.append(Transaction(
            user_id=user_id,
            amount=199.0,
            type=TransactionType.expense,
            category=TransactionCategory.entertainment,
            description="Netflix Subscription",
            date=datetime(year, month, 12),
            payment_method=PaymentMethod.card,
            is_recurring=True
        ))

        # Shopping
        for i in range(random.randint(2, 4)):
            transactions.append(Transaction(
                user_id=user_id,
                amount=round(random.uniform(500, 3000), 2),
                type=TransactionType.expense,
                category=TransactionCategory.shopping,
                description=random.choice(["Amazon order", "Flipkart purchase", "Clothing store", "Electronics"]),
                date=datetime(year, month, min(i * 7 + 5, 28)),
                payment_method=random.choice([PaymentMethod.card, PaymentMethod.upi])
            ))

        # Health (some months)
        if month_offset % 2 == 0:
            transactions.append(Transaction(
                user_id=user_id,
                amount=round(random.uniform(300, 1500), 2),
                type=TransactionType.expense,
                category=TransactionCategory.health,
                description=random.choice(["Pharmacy", "Doctor consultation", "Lab test"]),
                date=datetime(year, month, 20),
                payment_method=PaymentMethod.cash
            ))

        # Investment
        transactions.append(Transaction(
            user_id=user_id,
            amount=10000.0,
            type=TransactionType.expense,
            category=TransactionCategory.investment,
            description="SIP - Mutual Fund",
            date=datetime(year, month, 7),
            payment_method=PaymentMethod.netbanking,
            is_recurring=True
        ))

    # Add anomaly for current month
    transactions.append(Transaction(
        user_id=user_id,
        amount=15000.0,
        type=TransactionType.expense,
        category=TransactionCategory.food,
        description="Office party catering",
        date=now - timedelta(days=3),
        payment_method=PaymentMethod.card,
        notes="Unusual high food expense - office event"
    ))

    db.add_all(transactions)

    # Budgets
    current_month = now.month
    current_year = now.year
    budgets = [
        Budget(user_id=user_id, category=TransactionCategory.food, limit_amount=8000, month=current_month, year=current_year),
        Budget(user_id=user_id, category=TransactionCategory.transport, limit_amount=4000, month=current_month, year=current_year),
        Budget(user_id=user_id, category=TransactionCategory.shopping, limit_amount=5000, month=current_month, year=current_year),
        Budget(user_id=user_id, category=TransactionCategory.entertainment, limit_amount=2000, month=current_month, year=current_year),
        Budget(user_id=user_id, category=TransactionCategory.bills, limit_amount=3000, month=current_month, year=current_year),
        Budget(user_id=user_id, category=TransactionCategory.health, limit_amount=3000, month=current_month, year=current_year),
    ]
    db.add_all(budgets)

    # Goals
    goals = [
        Goal(
            user_id=user_id,
            name="Emergency Fund",
            target_amount=150000.0,
            current_amount=62000.0,
            target_date=now + timedelta(days=365),
            priority=GoalPriority.high,
            description="6 months of living expenses as emergency fund"
        ),
        Goal(
            user_id=user_id,
            name="New Laptop",
            target_amount=80000.0,
            current_amount=35000.0,
            target_date=now + timedelta(days=180),
            priority=GoalPriority.medium,
            description="MacBook Pro for work"
        ),
        Goal(
            user_id=user_id,
            name="Goa Vacation",
            target_amount=30000.0,
            current_amount=12000.0,
            target_date=now + timedelta(days=120),
            priority=GoalPriority.low,
            description="Year-end family vacation"
        ),
        Goal(
            user_id=user_id,
            name="Higher Education Fund",
            target_amount=500000.0,
            current_amount=85000.0,
            target_date=now + timedelta(days=730),
            priority=GoalPriority.high,
            description="MBA program fee savings"
        ),
    ]
    db.add_all(goals)

    # Notifications
    notifications = [
        Notification(
            user_id=user_id,
            type=NotificationType.unusual_transaction,
            title="Unusual Spending Detected",
            message="We detected an unusually high food expense of ₹15,000. This is 5x your average.",
            is_read=False
        ),
        Notification(
            user_id=user_id,
            type=NotificationType.budget_warning,
            title="Food Budget Warning",
            message="You've used 87% of your food budget this month. ₹1,040 remaining.",
            is_read=False
        ),
        Notification(
            user_id=user_id,
            type=NotificationType.savings_milestone,
            title="Savings Milestone! 🎉",
            message="Congratulations! You've saved ₹62,000 towards your Emergency Fund goal.",
            is_read=True
        ),
        Notification(
            user_id=user_id,
            type=NotificationType.goal_reminder,
            title="Laptop Goal Reminder",
            message="You're 43% of the way to your New Laptop goal. Keep it up!",
            is_read=True
        ),
    ]
    db.add_all(notifications)

    # Financial Profile
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
    if profile:
        profile.health_score = 68.5
        profile.savings_rate = 22.0
        profile.expense_ratio = 78.0
        profile.budget_adherence = 84.0
        profile.goal_progress = 41.0
    else:
        profile = FinancialProfile(
            user_id=user_id,
            health_score=68.5,
            savings_rate=22.0,
            expense_ratio=78.0,
            budget_adherence=84.0,
            goal_progress=41.0
        )
        db.add(profile)

    db.commit()
    return {"message": "Demo data seeded successfully", "transactions": len(transactions)}
