import json
import re
from typing import Optional
from config import GEMINI_API_KEY, GEMINI_MODEL

# Try to import google-generativeai
try:
    import google.generativeai as genai
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
    GEMINI_AVAILABLE = bool(GEMINI_API_KEY)
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None


def _get_model():
    if not GEMINI_AVAILABLE or genai is None:
        return None
    try:
        return genai.GenerativeModel(GEMINI_MODEL)
    except Exception:
        return None


def _safe_generate(prompt: str, fallback: str = "AI service is currently unavailable.") -> str:
    model = _get_model()
    if model is None:
        return fallback
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"AI service temporarily unavailable: {str(e)[:100]}"


# ─────────────────────────────────────────────
# Transaction Categorization
# ─────────────────────────────────────────────

CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment",
              "Education", "Health", "Salary", "Investment", "Other"]


def categorize_transaction(description: str) -> dict:
    """Use AI to categorize a transaction based on its description."""
    # Local rule-based fallback
    description_lower = description.lower()
    local_rules = {
        "Food": ["food", "swiggy", "zomato", "restaurant", "cafe", "grocery", "supermarket",
                 "dmart", "bigbasket", "dominos", "mcdonalds", "kfc", "pizza", "burger", "meal"],
        "Transport": ["ola", "uber", "metro", "fuel", "petrol", "diesel", "auto", "bus",
                      "train", "flight", "cab", "rapido", "fastag"],
        "Shopping": ["amazon", "flipkart", "myntra", "ajio", "clothing", "mall", "shop",
                     "purchase", "buy", "order", "electronics"],
        "Bills": ["electricity", "water", "gas", "internet", "phone", "mobile", "bill",
                  "recharge", "jio", "airtel", "bsnl", "wifi"],
        "Entertainment": ["netflix", "spotify", "prime", "movie", "theatre", "concert",
                          "game", "subscription", "hotstar", "youtube"],
        "Education": ["course", "book", "udemy", "coursera", "school", "college",
                      "tuition", "class", "education", "training"],
        "Health": ["doctor", "hospital", "pharmacy", "medicine", "lab", "test",
                   "health", "clinic", "medical", "dental"],
        "Salary": ["salary", "wage", "income", "payroll", "stipend", "pay"],
        "Investment": ["sip", "mutual fund", "stock", "share", "invest", "fd", "ppf", "nps"],
    }

    for category, keywords in local_rules.items():
        if any(kw in description_lower for kw in keywords):
            if GEMINI_AVAILABLE:
                # Confirm with AI
                break
            return {"category": category, "confidence": "High", "method": "rule-based"}

    if not GEMINI_AVAILABLE:
        return {"category": "Other", "confidence": "Low", "method": "rule-based"}

    prompt = f"""You are a financial transaction categorizer. Given the transaction description below, 
suggest the most appropriate category from this list: {', '.join(CATEGORIES)}.

Transaction: "{description}"

Respond ONLY with a valid JSON object like this:
{{"category": "Food", "confidence": "High", "reason": "Brief explanation"}}

Confidence levels: High, Medium, Low
Choose exactly one category from the list provided."""

    result = _safe_generate(prompt, '{"category": "Other", "confidence": "Low", "reason": "AI unavailable"}')

    try:
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            if data.get("category") not in CATEGORIES:
                data["category"] = "Other"
            data["method"] = "ai"
            return data
    except Exception:
        pass

    return {"category": "Other", "confidence": "Low", "method": "fallback"}


# ─────────────────────────────────────────────
# Financial Assistant Chat
# ─────────────────────────────────────────────

def _generate_rule_based_chat_response(question: str, financial_context: dict) -> str:
    """Intelligent rule-based personal finance advisor responding with actual user context."""
    q_lower = question.lower()
    user_name = financial_context.get("user_name", "there")
    income = financial_context.get("monthly_income", 0.0)
    expense = financial_context.get("monthly_expense", 0.0)
    savings = financial_context.get("monthly_savings", 0.0)
    savings_rate = financial_context.get("savings_rate", 0.0)
    cat_spending = financial_context.get("category_spending", {})
    active_budgets = financial_context.get("active_budgets", [])
    active_goals = financial_context.get("active_goals", [])

    # Sort categories by spending
    sorted_cats = sorted(cat_spending.items(), key=lambda x: x[1], reverse=True) if cat_spending else []

    # 1. Highest Spending / Where did I spend
    if any(k in q_lower for k in ["where", "most", "highest spending", "top expense", "spent the most"]):
        if sorted_cats:
            top_cat, top_amt = sorted_cats[0]
            pct = (top_amt / expense * 100) if expense > 0 else 0
            breakdown_lines = "\n".join([
                f"- **{c}**: ₹{amt:,.0f} ({(amt/expense*100) if expense > 0 else 0:.1f}%)"
                for c, amt in sorted_cats[:4]
            ])
            return (
                f"### Spending Analysis for {financial_context.get('current_month', 'this month')}\n\n"
                f"Based on your actual records, your highest spending category is **{top_cat}** at **₹{top_amt:,.0f}**, "
                f"which accounts for **{pct:.1f}%** of your total monthly expenses (₹{expense:,.0f}).\n\n"
                f"**Top Spending Categories:**\n{breakdown_lines}\n\n"
                f"💡 **Recommendation:** To optimize cash flow, review your discretionary expenses in {top_cat} "
                f"and aim to keep non-essential categories under 15% of your income.\n\n"
                f"_Note: This is educational information and not professional financial advice._"
            )
        else:
            return (
                f"Based on your account, no expense transactions have been recorded for {financial_context.get('current_month', 'this month')} yet. "
                f"Add your daily transactions to see an automated breakdown of your highest spending categories!\n\n"
                f"_Note: This is educational information and not professional financial advice._"
            )

    # 2. How much can I save / Savings potential
    if any(k in q_lower for k in ["how much can i save", "savings potential", "save more", "increase savings"]):
        rec_savings = income * 0.20
        discretionary_spend = sum(cat_spending.get(c, 0) for c in ["Shopping", "Entertainment", "Food"])
        return (
            f"### Savings Assessment for {user_name}\n\n"
            f"Here is your current savings breakdown:\n"
            f"- **Monthly Income:** ₹{income:,.0f}\n"
            f"- **Monthly Expenses:** ₹{expense:,.0f}\n"
            f"- **Current Net Savings:** ₹{savings:,.0f} ({savings_rate:.1f}% savings rate)\n\n"
            f"📊 **Target Benchmark (20%+ Rule):** Aim to save at least **₹{rec_savings:,.0f}/month** (20% of income).\n\n"
            f"🔍 **Opportunity Areas:** You currently spend **₹{discretionary_spend:,.0f}** across Shopping, Food, and Entertainment. "
            f"Reducing discretionary spending by just 15-20% could free up an extra **₹{discretionary_spend * 0.2:,.0f}/month** towards your goals!\n\n"
            f"_Note: This is educational information and not professional financial advice._"
        )

    # 3. How to reduce expenses / cut costs
    if any(k in q_lower for k in ["reduce", "cut", "lower", "decrease", "less money"]):
        return (
            f"### Actionable Strategies to Reduce Expenses\n\n"
            f"Based on your financial data (Current expenses: ₹{expense:,.0f}/month):\n\n"
            f"1. **Food & Dining:** Cook in batches and limit online food delivery (Swiggy/Zomato) to once a week. Delivery charges and markup add 30-50% to meal costs.\n"
            f"2. **Subscriptions & Utilities:** Audit recurring streaming, gym, and app subscriptions. Cancel any unused services.\n"
            f"3. **The 48-Hour Rule for Shopping:** Before any non-essential purchase above ₹1,000, wait 48 hours to prevent impulse buys.\n"
            f"4. **Transport Optimization:** Combine errands and utilize public transit (Metro/Bus) or carpooling for regular commutes.\n\n"
            f"_Note: This is educational information and not professional financial advice._"
        )

    # 4. 50/30/20 Rule
    if any(k in q_lower for k in ["50/30/20", "50 30 20", "rule", "budget rule"]):
        needs = (income or 50000) * 0.50
        wants = (income or 50000) * 0.30
        sav = (income or 50000) * 0.20
        return (
            f"### The 50/30/20 Budgeting Rule\n\n"
            f"The 50/30/20 rule is a proven framework for balancing your finances:\n\n"
            f"- **50% Needs (₹{needs:,.0f}):** Essential living costs like rent, groceries, utilities, basic transport, and insurance.\n"
            f"- **30% Wants (₹{wants:,.0f}):** Lifestyle choices such as dining out, shopping, hobbies, and entertainment subscriptions.\n"
            f"- **20% Savings & Debt (₹{sav:,.0f}):** Emergency funds, mutual fund SIPs, PPF, and extra debt repayments.\n\n"
            f"*(Calculated based on your monthly income of ₹{income:,.0f})*\n\n"
            f"_Note: This is educational information and not professional financial advice._"
        )

    # 5. Budget Plan / Recommendations
    if any(k in q_lower for k in ["budget plan", "recommend a budget", "plan for next month", "create budget"]):
        return (
            f"### Suggested Monthly Budget Plan\n\n"
            f"Based on your income of **₹{income:,.0f}**, here is an optimized allocation:\n\n"
            f"- 🍔 **Food & Groceries:** ₹{(income * 0.15):,.0f} (15%)\n"
            f"- 🚗 **Transport & Fuel:** ₹{(income * 0.08):,.0f} (8%)\n"
            f"- 📄 **Bills & Utilities:** ₹{(income * 0.12):,.0f} (12%)\n"
            f"- 🛍️ **Shopping & Personal:** ₹{(income * 0.10):,.0f} (10%)\n"
            f"- 🎬 **Entertainment:** ₹{(income * 0.05):,.0f} (5%)\n"
            f"- 🏥 **Health & Emergency Buffer:** ₹{(income * 0.05):,.0f} (5%)\n"
            f"- 📈 **Investments & Savings:** ₹{(income * 0.25):,.0f} (25%)\n\n"
            f"💡 You can set these up directly in the **Budgets** tab to get automated overspending alerts.\n\n"
            f"_Note: This is educational information and not professional financial advice._"
        )

    # 6. Emergency Fund
    if any(k in q_lower for k in ["emergency fund", "emergency savings", "contingency"]):
        target_3m = (expense or 30000) * 3
        target_6m = (expense or 30000) * 6
        return (
            f"### Building Your Emergency Fund\n\n"
            f"An emergency fund protects you against unforeseen job loss, medical emergencies, or urgent repairs without going into high-interest debt.\n\n"
            f"- **Your Target Size:** 3 to 6 months of living expenses = **₹{target_3m:,.0f} to ₹{target_6m:,.0f}**.\n"
            f"- **Where to park it:**\n"
            f"  1. 50% in a high-yield Savings Account or Sweep-in Fixed Deposit (instant liquidity).\n"
            f"  2. 50% in a low-risk Liquid Mutual Fund / Overnight Fund.\n"
            f"- **Action Plan:** Allocate ₹{(savings * 0.5 if savings > 0 else 5000):,.0f}/month until your emergency threshold is met.\n\n"
            f"_Note: This is educational information and not professional financial advice._"
        )

    # 7. Investment options in India
    if any(k in q_lower for k in ["investment", "invest", "mutual fund", "sip", "stocks", "india", "ppf"]):
        return (
            f"### Smart Investment Options in India\n\n"
            f"For long-term wealth creation, consider this balanced allocation:\n\n"
            f"1. **Equity Index Mutual Funds (Nifty 50 / Nifty Next 50):** Low expense ratio, broad market diversification, ideal for 5+ year horizons via monthly SIP.\n"
            f"2. **ELSS (Equity Linked Savings Scheme):** Tax deduction under Section 80C up to ₹1.5 Lakh with the shortest lock-in (3 years).\n"
            f"3. **PPF (Public Provident Fund):** Sovereign guarantee, EEE tax-exempt status, current interest ~7.1% p.a.\n"
            f"4. **NPS (National Pension Scheme):** Additional ₹50,000 deduction under Section 80CCD(1B) for retirement corpus.\n"
            f"5. **Sovereign Gold Bonds (SGB) / Gold ETFs:** 5-10% portfolio hedge.\n\n"
            f"_Note: This is educational information and not professional financial advice._"
        )

    # 8. Financial Health Score
    if any(k in q_lower for k in ["health score", "financial health", "score", "improve score"]):
        return (
            f"### How to Improve Your Financial Health Score\n\n"
            f"The platform calculates your Financial Health Score (0–100) based on 4 measurable metrics:\n\n"
            f"1. **Savings Rate (35% Weight):** Aim for 20%+ savings of monthly income. Current: **{savings_rate:.1f}%**.\n"
            f"2. **Expense Ratio (30% Weight):** Keep total expenses below 70-80% of your earnings.\n"
            f"3. **Budget Adherence (20% Weight):** Avoid exceeding monthly category spending limits.\n"
            f"4. **Goal Progress (15% Weight):** Make steady monthly contributions to your active financial goals.\n\n"
            f"_Note: This is educational information and not professional financial advice._"
        )

    # 9. General default response
    return (
        f"### Financial Overview for {user_name}\n\n"
        f"Here is a summary of your financial profile:\n"
        f"- **Current Month Income:** ₹{income:,.0f}\n"
        f"- **Current Month Expenses:** ₹{expense:,.0f}\n"
        f"- **Net Savings:** ₹{savings:,.0f} ({savings_rate:.1f}% savings rate)\n"
        f"- **Active Budgets:** {len(active_budgets)} category limits configured\n"
        f"- **Active Goals:** {len(active_goals)} savings goals in progress\n\n"
        f"You can ask me questions such as:\n"
        f"- *'Where did I spend the most this month?'*\n"
        f"- *'How can I save more money?'*\n"
        f"- *'What is the 50/30/20 budget rule for my income?'*\n"
        f"- *'How do I build an emergency fund?'*\n"
        f"- *'What are good investment options in India?'*\n\n"
        f"_Note: This is educational information and not professional financial advice._"
    )


def chat_with_advisor(
    question: str,
    financial_context: dict,
    chat_history: list = None
) -> dict:
    """AI financial assistant using actual user data with intelligent rule-based fallback."""
    if not GEMINI_AVAILABLE:
        answer = _generate_rule_based_chat_response(question, financial_context)
        return {
            "answer": answer,
            "is_ai": False,
            "is_fallback": True,
            "data_based": True,
            "disclaimer": "This assistant provides educational financial information and is not a substitute for a qualified financial advisor."
        }

    context_str = json.dumps(financial_context, indent=2, default=str)

    history_str = ""
    if chat_history:
        for msg in chat_history[-6:]:
            role = "User" if msg.get("role") == "user" else "Assistant"
            history_str += f"{role}: {msg.get('content', '')}\n"

    prompt = f"""You are a helpful, empathetic personal finance advisor for an Indian user.
You have access to the user's actual financial data below. Use this data to give personalized, 
accurate answers. Do NOT fabricate financial numbers.

USER'S FINANCIAL DATA:
{context_str}

CONVERSATION HISTORY:
{history_str}

USER QUESTION: {question}

INSTRUCTIONS:
1. Answer based on the actual data provided. Quote specific numbers from the data.
2. If the question is about the user's finances, use the data. If it's a general finance question, provide educational information.
3. Be concise, friendly, and actionable.
4. Use Indian Rupee (₹) for amounts.
5. If you're using data from their profile, say "Based on your data..."
6. If giving general advice, say "In general..." or "Financial experts recommend..."
7. Always end responses related to financial decisions with this disclaimer on a new line:
   "_Note: This is educational information and not professional financial advice._"

Provide a helpful, structured response using markdown formatting where appropriate."""

    answer = _safe_generate(prompt, "")
    if not answer or "unavailable" in answer.lower():
        answer = _generate_rule_based_chat_response(question, financial_context)

    return {
        "answer": answer,
        "is_ai": True,
        "data_based": True,
        "disclaimer": "This assistant provides educational financial information and is not a substitute for a qualified financial advisor."
    }


# ─────────────────────────────────────────────
# AI Insights Generation
# ─────────────────────────────────────────────

def generate_insights(financial_data: dict) -> list:
    """Generate actionable AI insights from financial data."""
    insights = []

    # Always compute local rule-based insights
    monthly_data = financial_data.get("monthly_comparison", {})
    current = monthly_data.get("current_month", {})
    previous = monthly_data.get("previous_month", {})

    # Spending increase insight
    if current.get("total_expense", 0) > 0 and previous.get("total_expense", 0) > 0:
        change_pct = ((current["total_expense"] - previous["total_expense"]) / previous["total_expense"]) * 100
        if change_pct > 15:
            insights.append({
                "type": "warning",
                "icon": "📈",
                "title": "Spending Increase Detected",
                "message": f"Your expenses increased by {change_pct:.1f}% compared to last month. Review your spending patterns.",
                "category": "general"
            })
        elif change_pct < -10:
            insights.append({
                "type": "success",
                "icon": "📉",
                "title": "Great Spending Reduction!",
                "message": f"Your expenses decreased by {abs(change_pct):.1f}% compared to last month. Keep it up!",
                "category": "general"
            })

    # Category insights
    category_spending = financial_data.get("category_spending", {})
    if category_spending:
        top_category = max(category_spending, key=category_spending.get)
        top_amount = category_spending[top_category]
        total_expense = current.get("total_expense", 1)
        pct = (top_amount / total_expense * 100) if total_expense > 0 else 0
        insights.append({
            "type": "info",
            "icon": "🏆",
            "title": f"Highest Spending: {top_category}",
            "message": f"{top_category} is your top expense at ₹{top_amount:,.0f} ({pct:.1f}% of total expenses).",
            "category": top_category
        })

    # Budget insights
    budgets = financial_data.get("budgets", [])
    for budget in budgets:
        pct_used = budget.get("percentage_used", 0)
        if pct_used > 90:
            insights.append({
                "type": "danger",
                "icon": "🚨",
                "title": f"{budget['category']} Budget Critical",
                "message": f"You've used {pct_used:.0f}% of your {budget['category']} budget. Only ₹{budget.get('remaining', 0):,.0f} remaining.",
                "category": budget["category"]
            })
        elif pct_used > 70:
            insights.append({
                "type": "warning",
                "icon": "⚠️",
                "title": f"{budget['category']} Budget Warning",
                "message": f"You've used {pct_used:.0f}% of your {budget['category']} budget. Monitor spending carefully.",
                "category": budget["category"]
            })

    # Savings rate insight
    savings_rate = financial_data.get("savings_rate", 0)
    if savings_rate < 10:
        insights.append({
            "type": "warning",
            "icon": "💰",
            "title": "Low Savings Rate",
            "message": f"Your savings rate is {savings_rate:.1f}%. Financial experts recommend saving at least 20% of income.",
            "category": "savings"
        })
    elif savings_rate >= 20:
        insights.append({
            "type": "success",
            "icon": "✅",
            "title": "Excellent Savings Rate!",
            "message": f"Your savings rate is {savings_rate:.1f}%, which meets the recommended 20%+ benchmark. Well done!",
            "category": "savings"
        })

    # If AI available, add AI insight
    if GEMINI_AVAILABLE and financial_data:
        prompt = f"""Given this financial summary, provide ONE specific actionable insight in 1-2 sentences.
Data: {json.dumps(financial_data, default=str)[:2000]}
Format: Just the insight text, no JSON, no bullet points."""

        ai_insight = _safe_generate(prompt, "")
        if ai_insight and len(ai_insight) > 20:
            insights.append({
                "type": "ai",
                "icon": "🤖",
                "title": "AI Recommendation",
                "message": ai_insight,
                "category": "ai"
            })

    return insights[:8]  # Return top 8 insights


# ─────────────────────────────────────────────
# Budget Recommendations
# ─────────────────────────────────────────────

def generate_budget_recommendations(spending_history: dict, income: float) -> dict:
    """Generate AI budget recommendations based on spending history."""
    if not GEMINI_AVAILABLE:
        # Rule-based recommendations using 50/30/20 rule
        needs = income * 0.50
        wants = income * 0.30
        savings = income * 0.20
        return {
            "method": "50/30/20 Rule",
            "recommendations": {
                "Food": round(income * 0.15, 0),
                "Transport": round(income * 0.10, 0),
                "Bills": round(income * 0.15, 0),
                "Shopping": round(income * 0.10, 0),
                "Entertainment": round(income * 0.05, 0),
                "Health": round(income * 0.05, 0),
                "Investment": round(income * 0.20, 0),
            },
            "summary": f"Based on the 50/30/20 rule for ₹{income:,.0f} income: Needs ₹{needs:,.0f}, Wants ₹{wants:,.0f}, Savings ₹{savings:,.0f}",
            "is_ai": False
        }

    prompt = f"""You are a personal finance expert. Based on the user's spending history and monthly income, 
suggest optimal budget limits for next month.

Monthly Income: ₹{income:,.0f}
Average Monthly Spending by Category:
{json.dumps(spending_history, indent=2)}

Provide budget recommendations as a JSON object with category names as keys and suggested amounts as values.
Also include a "summary" field with a brief explanation.
Use Indian context (INR amounts).
Ensure total recommended spending is less than income (leave 20-25% for savings).

Respond ONLY with valid JSON:
{{"Food": 8000, "Transport": 4000, "Bills": 3000, "Shopping": 5000, "Entertainment": 2000, "Health": 2000, "Investment": 15000, "summary": "explanation here", "is_ai": true}}"""

    result = _safe_generate(prompt)
    try:
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            data["method"] = "AI Analysis"
            data["is_ai"] = True
            return data
    except Exception:
        pass

    return {"error": "Could not generate recommendations", "is_ai": False}


# ─────────────────────────────────────────────
# Goal Analysis
# ─────────────────────────────────────────────

def analyze_goal(goal: dict, monthly_savings: float) -> dict:
    """AI analysis for a financial goal."""
    from datetime import datetime

    target_date = goal.get("target_date")
    remaining = goal.get("target_amount", 0) - goal.get("current_amount", 0)

    try:
        if isinstance(target_date, str):
            target_date = datetime.fromisoformat(target_date.replace("Z", "+00:00"))
        months_remaining = max(1, (target_date - datetime.now(target_date.tzinfo)).days // 30)
    except Exception:
        months_remaining = 12

    required_monthly = remaining / months_remaining if months_remaining > 0 else remaining
    on_track = monthly_savings >= required_monthly

    result = {
        "months_remaining": months_remaining,
        "required_monthly_saving": round(required_monthly, 2),
        "current_monthly_saving": round(monthly_savings, 2),
        "on_track": on_track,
        "shortfall": round(max(0, required_monthly - monthly_savings), 2),
        "estimated_completion": None,
        "suggestion": ""
    }

    if monthly_savings > 0:
        months_to_complete = remaining / monthly_savings
        from datetime import timedelta
        result["estimated_completion"] = (datetime.now() + timedelta(days=months_to_complete * 30)).strftime("%B %Y")

    if not GEMINI_AVAILABLE:
        if on_track:
            result["suggestion"] = f"Great! You're on track. Keep saving ₹{required_monthly:,.0f}/month."
        else:
            result["suggestion"] = f"You need ₹{required_monthly:,.0f}/month but currently saving ₹{monthly_savings:,.0f}/month. Consider cutting discretionary expenses."
        return result

    prompt = f"""Goal: {goal.get('name')} - Save ₹{goal.get('target_amount'):,.0f} by {target_date}
Current saved: ₹{goal.get('current_amount'):,.0f}
Remaining: ₹{remaining:,.0f}
Months left: {months_remaining}
Required monthly: ₹{required_monthly:,.0f}
Current savings rate: ₹{monthly_savings:,.0f}/month
On track: {on_track}

Give a 2-3 sentence motivational suggestion on how to achieve this goal faster or stay on track. Be specific and practical for Indian users."""

    result["suggestion"] = _safe_generate(prompt, result["suggestion"])
    return result


# ─────────────────────────────────────────────
# Financial Health Score
# ─────────────────────────────────────────────

def calculate_financial_health(data: dict) -> dict:
    """Calculate transparent financial health metrics."""
    income = data.get("total_income", 0)
    expense = data.get("total_expense", 0)
    savings = max(0, income - expense)

    savings_rate = (savings / income * 100) if income > 0 else 0
    expense_ratio = (expense / income * 100) if income > 0 else 100

    # Budget adherence
    budgets = data.get("budgets", [])
    if budgets:
        adhered = [b for b in budgets if b.get("percentage_used", 100) <= 100]
        budget_adherence = (len(adhered) / len(budgets)) * 100
    else:
        budget_adherence = 50.0

    # Goal progress
    goals = data.get("goals", [])
    if goals:
        goal_progress = sum(
            min(100, (g.get("current_amount", 0) / g.get("target_amount", 1)) * 100)
            for g in goals
        ) / len(goals)
    else:
        goal_progress = 0.0

    # Compute score
    score = (
        min(100, savings_rate * 3) * 0.35 +
        max(0, 100 - expense_ratio) * 0.30 +
        budget_adherence * 0.20 +
        goal_progress * 0.15
    )
    score = min(100, max(0, score))

    metrics = {
        "health_score": round(score, 1),
        "savings_rate": round(savings_rate, 1),
        "expense_ratio": round(expense_ratio, 1),
        "budget_adherence": round(budget_adherence, 1),
        "goal_progress": round(goal_progress, 1),
        "factors": {
            "savings_rate": {"value": round(savings_rate, 1), "weight": "35%", "status": "good" if savings_rate >= 20 else "warning" if savings_rate >= 10 else "poor"},
            "expense_ratio": {"value": round(expense_ratio, 1), "weight": "30%", "status": "good" if expense_ratio <= 70 else "warning" if expense_ratio <= 85 else "poor"},
            "budget_adherence": {"value": round(budget_adherence, 1), "weight": "20%", "status": "good" if budget_adherence >= 80 else "warning" if budget_adherence >= 60 else "poor"},
            "goal_progress": {"value": round(goal_progress, 1), "weight": "15%", "status": "good" if goal_progress >= 50 else "warning" if goal_progress >= 25 else "poor"},
        }
    }

    # AI narrative
    if GEMINI_AVAILABLE:
        prompt = f"""Financial Health Score: {score:.0f}/100
Savings Rate: {savings_rate:.1f}%
Expense Ratio: {expense_ratio:.1f}%
Budget Adherence: {budget_adherence:.1f}%
Goal Progress: {goal_progress:.1f}%

Write a 3-4 sentence educational summary of this person's financial health. Be encouraging but honest. 
Mention what they're doing well and one key area to improve. Use Indian context."""

        metrics["ai_narrative"] = _safe_generate(prompt, "")
    else:
        if score >= 75:
            metrics["ai_narrative"] = "Your financial health is strong. You maintain good savings habits and budget discipline."
        elif score >= 50:
            metrics["ai_narrative"] = "Your finances are on a reasonable track but there's room for improvement, especially in savings rate."
        else:
            metrics["ai_narrative"] = "Your financial health needs attention. Focus on reducing expenses and building an emergency fund first."

    return metrics


# ─────────────────────────────────────────────
# Report Generation
# ─────────────────────────────────────────────

def generate_report_summary(report_data: dict) -> str:
    """Generate AI narrative for financial report."""
    if not GEMINI_AVAILABLE:
        income = report_data.get("total_income", 0)
        expense = report_data.get("total_expense", 0)
        savings = income - expense
        top_cat = report_data.get("top_category", "Unknown")
        return (
            f"**Financial Summary**\n\n"
            f"Your total income was ₹{income:,.0f}.\n"
            f"Your total expenses were ₹{expense:,.0f}.\n"
            f"Your net savings were ₹{savings:,.0f} ({(savings/income*100) if income > 0 else 0:.1f}% savings rate).\n"
            f"Your highest spending category was **{top_cat}**.\n"
        )

    prompt = f"""Generate a professional financial report summary for the following data:
{json.dumps(report_data, indent=2, default=str)[:3000]}

Write 4-6 sentences covering:
1. Income and expense overview
2. Savings achieved
3. Top spending category and whether it was within budget
4. One actionable recommendation for next period

Use ₹ for currency. Be professional and data-driven."""

    return _safe_generate(prompt)
