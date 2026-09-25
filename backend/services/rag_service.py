"""
RAG Service - Retrieval Augmented Generation for financial knowledge.
Uses a local knowledge base with keyword search, then augments with Gemini.
"""
import re
from typing import List, Tuple
from config import GEMINI_API_KEY, GEMINI_MODEL

try:
    import google.generativeai as genai
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
    GEMINI_AVAILABLE = bool(GEMINI_API_KEY)
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None


# ─────────────────────────────────────────────
# Local Knowledge Base
# ─────────────────────────────────────────────

KNOWLEDGE_BASE = [
    {
        "id": "kb_001",
        "title": "50/30/20 Budgeting Rule",
        "content": (
            "The 50/30/20 rule is a popular budgeting guideline. Allocate 50% of after-tax income "
            "to needs (rent, food, utilities, transport), 30% to wants (entertainment, dining, shopping), "
            "and 20% to savings and debt repayment. In India, given higher savings culture, many experts "
            "suggest 50/20/30 — prioritizing savings at 30%."
        ),
        "tags": ["budget", "rule", "50/30/20", "planning", "allocation", "savings"]
    },
    {
        "id": "kb_002",
        "title": "Emergency Fund",
        "content": (
            "An emergency fund is 3-6 months of living expenses kept in a liquid, low-risk account "
            "(savings account or liquid mutual fund). In India, given job market volatility, 6 months is recommended. "
            "Build your emergency fund before investing. Keep it separate from regular savings. "
            "Typical target: ₹1.5L - ₹3L for a single person in a metro city."
        ),
        "tags": ["emergency", "fund", "savings", "liquid", "safety", "3-6 months"]
    },
    {
        "id": "kb_003",
        "title": "SIP - Systematic Investment Plan",
        "content": (
            "SIP (Systematic Investment Plan) allows you to invest a fixed amount monthly in mutual funds. "
            "Benefits: rupee cost averaging, power of compounding, discipline, low starting amount (₹500/month). "
            "Ideal for long-term wealth creation. Equity SIPs are best held for 5+ years. "
            "ELSS mutual funds offer tax deduction under Section 80C up to ₹1.5L per year."
        ),
        "tags": ["sip", "mutual fund", "investment", "equity", "compounding", "wealth", "80C"]
    },
    {
        "id": "kb_004",
        "title": "Debt Management - Getting Out of Debt",
        "content": (
            "Two popular debt repayment strategies: "
            "1. Avalanche method: Pay minimum on all, extra on highest interest first (saves most money). "
            "2. Snowball method: Pay minimum on all, extra on smallest balance first (builds momentum). "
            "In India, credit card debt at 36-42% APR is extremely costly — always pay in full. "
            "Personal loans at 12-18% should be paid before investing in low-return instruments."
        ),
        "tags": ["debt", "loan", "credit card", "repayment", "avalanche", "snowball", "interest"]
    },
    {
        "id": "kb_005",
        "title": "Savings Rate and Financial Independence",
        "content": (
            "Savings rate is the percentage of income saved each month. "
            "10% savings rate: Standard. 20%: Good. 30%+: Excellent. "
            "Higher savings rates dramatically reduce time to financial independence. "
            "Ways to increase savings: reduce subscriptions, cook at home, avoid lifestyle inflation, "
            "automate savings (pay yourself first), use UPI cashbacks. "
            "Track every expense for at least 3 months to identify spending leaks."
        ),
        "tags": ["savings", "rate", "financial independence", "FIRE", "income", "expense"]
    },
    {
        "id": "kb_006",
        "title": "Tax Saving Investments in India",
        "content": (
            "Section 80C (up to ₹1.5L): ELSS funds, PPF, EPF, NSC, life insurance premiums, "
            "5-year FD, home loan principal. "
            "Section 80D: Health insurance premiums (₹25,000 self, ₹50,000 parents senior citizen). "
            "Section 24(b): Home loan interest up to ₹2L. "
            "NPS (National Pension System): Additional ₹50,000 under Section 80CCD(1B). "
            "Plan tax saving early in the financial year (April-March) to avoid last-minute rush."
        ),
        "tags": ["tax", "80C", "ELSS", "PPF", "NPS", "insurance", "india", "saving", "80D"]
    },
    {
        "id": "kb_007",
        "title": "Budget Management Best Practices",
        "content": (
            "Effective budgeting tips: "
            "1. Track all expenses — even small ones add up. ₹50 daily chai = ₹1,500/month. "
            "2. Use zero-based budgeting: allocate every rupee a purpose. "
            "3. Review budget weekly, not just at month end. "
            "4. Build buffer (5-10%) for unexpected expenses. "
            "5. Use UPI transaction history to track automatically. "
            "6. Separate wants from needs ruthlessly. OTT platforms, eating out, shopping are wants."
        ),
        "tags": ["budget", "tracking", "zero-based", "expenses", "management", "tips"]
    },
    {
        "id": "kb_008",
        "title": "Investment Basics for Beginners",
        "content": (
            "Investment ladder for Indian beginners: "
            "1. Build emergency fund (3-6 months expenses). "
            "2. Get adequate health and term insurance. "
            "3. Start SIP in index funds (Nifty 50, Sensex index funds — low cost, diversified). "
            "4. Use PPF for guaranteed returns + tax benefit. "
            "5. Explore FDs for short-term (1-3 year) goals. "
            "6. Only then consider direct stocks (requires research and time). "
            "Golden rule: Never invest money you can't afford to lose in equity."
        ),
        "tags": ["investment", "beginner", "index fund", "PPF", "FD", "insurance", "equity"]
    },
    {
        "id": "kb_009",
        "title": "Reducing Food and Dining Expenses",
        "content": (
            "Food is typically the largest discretionary expense. Tips to reduce: "
            "1. Meal prep Sunday — cook for 3-4 days at once. "
            "2. Use Swiggy/Zomato only for special occasions (delivery adds 40-60% to food cost). "
            "3. Grocery shop with a list — avoid impulse purchases. "
            "4. Buy from local vendors/kirana stores for fresh produce. "
            "5. Use cashback offers on grocery apps. "
            "6. Track food delivery frequency — once/week maximum recommended."
        ),
        "tags": ["food", "dining", "expense", "reduce", "swiggy", "zomato", "grocery"]
    },
    {
        "id": "kb_010",
        "title": "Financial Planning for Young Professionals in India",
        "content": (
            "Key milestones for 22-30 year olds: "
            "1. Get health insurance immediately (before pre-existing conditions develop). "
            "2. Start term insurance if dependents exist (₹1 Cr cover, very affordable young). "
            "3. Start EPF contributions (employer matches up to 12% of basic salary). "
            "4. Open PPF account — ₹500/month minimum, tax free after 15 years. "
            "5. Build credit score — use credit card for regular expenses, pay full amount. "
            "6. Create a financial plan: short-term (1-2yr), medium-term (3-5yr), long-term (10yr+)."
        ),
        "tags": ["young", "professional", "india", "EPF", "PPF", "term insurance", "planning", "milestone"]
    },
    {
        "id": "kb_011",
        "title": "Expense Categories and Average Spending",
        "content": (
            "Typical expense breakdown for a salaried professional in Indian metro city (monthly ₹50k income): "
            "Rent: 25-30% (₹12,500-15,000). Food: 10-15% (₹5,000-7,500). Transport: 5-10% (₹2,500-5,000). "
            "Utilities/Bills: 5% (₹2,500). Entertainment: 5% (₹2,500). Shopping: 5-10% (₹2,500-5,000). "
            "Savings/Investment: 20-30% (₹10,000-15,000). Health: 2-5% (₹1,000-2,500)."
        ),
        "tags": ["expense", "category", "spending", "metro", "india", "rent", "average", "benchmark"]
    },
    {
        "id": "kb_012",
        "title": "Anomaly Detection and Unusual Spending",
        "content": (
            "Unusual spending can be identified by comparing current expenses to 3-month average. "
            "An expense 2x or more above the 3-month category average is flagged as unusual. "
            "Common causes: annual subscriptions, festivals, travel, medical emergencies, impulse purchases. "
            "When you see unusual spending: verify it was intentional, check for fraud if not recognized, "
            "and adjust next month's budget to compensate."
        ),
        "tags": ["anomaly", "unusual", "spending", "detection", "fraud", "high expense"]
    },
]


def _compute_relevance(query: str, doc: dict) -> float:
    """Simple TF-IDF-like relevance scoring."""
    query_words = set(re.findall(r'\w+', query.lower()))
    doc_words = set(re.findall(r'\w+', doc["content"].lower()))
    doc_tags = set(tag.lower() for tag in doc.get("tags", []))
    doc_title_words = set(re.findall(r'\w+', doc["title"].lower()))

    # Tag match (highest weight)
    tag_matches = len(query_words & doc_tags) * 3
    # Title match
    title_matches = len(query_words & doc_title_words) * 2
    # Content match
    content_matches = len(query_words & doc_words) * 1

    total = tag_matches + title_matches + content_matches
    return total


def retrieve_relevant_docs(query: str, top_k: int = 3) -> List[dict]:
    """Retrieve most relevant knowledge base documents for a query."""
    scored = [
        (doc, _compute_relevance(query, doc))
        for doc in KNOWLEDGE_BASE
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    # Return docs with some relevance
    relevant = [(doc, score) for doc, score in scored if score > 0][:top_k]
    if not relevant:
        # Return top 2 generic docs
        relevant = [(doc, score) for doc, score in scored[:2]]
    return [doc for doc, _ in relevant]


def rag_query(question: str, user_financial_context: dict = None) -> dict:
    """Full RAG pipeline: retrieve + generate."""
    # 1. Retrieve relevant documents
    retrieved_docs = retrieve_relevant_docs(question, top_k=3)

    # 2. Build context
    knowledge_context = "\n\n".join([
        f"[{doc['title']}]\n{doc['content']}"
        for doc in retrieved_docs
    ])

    # 3. Add user context if available
    user_context_str = ""
    if user_financial_context:
        import json
        user_context_str = f"\nUser's Financial Context:\n{json.dumps(user_financial_context, default=str)[:1000]}"

    sources = [{"id": doc["id"], "title": doc["title"]} for doc in retrieved_docs]

    if not GEMINI_AVAILABLE:
        # Return knowledge base info without AI
        answer = (
            f"**Based on our financial knowledge base:**\n\n"
            f"{knowledge_context[:800]}\n\n"
            "_Note: Enable AI (GEMINI_API_KEY) for personalized answers._"
        )
        return {
            "answer": answer,
            "sources": sources,
            "retrieved_count": len(retrieved_docs),
            "is_rag": True,
            "is_ai": False
        }

    # 4. Generate with Gemini
    model = genai.GenerativeModel(GEMINI_MODEL)

    prompt = f"""You are a knowledgeable Indian personal finance advisor using a knowledge base and user data.

KNOWLEDGE BASE CONTEXT:
{knowledge_context}
{user_context_str}

USER QUESTION: {question}

INSTRUCTIONS:
1. Answer based primarily on the knowledge base provided above.
2. If the user has financial data, incorporate it to give personalized advice.
3. Cite which knowledge base sections informed your answer.
4. Be practical, specific, and use Indian context (₹, Indian financial products).
5. Keep response concise but complete (3-5 paragraphs max).
6. End with: "_Sources: [list the knowledge base titles used]_"

Provide a clear, helpful response:"""

    try:
        response = model.generate_content(prompt)
        answer = response.text.strip()
    except Exception as e:
        answer = (
            f"Based on our knowledge base:\n\n{knowledge_context[:600]}\n\n"
            f"_(AI enhancement temporarily unavailable)_"
        )

    return {
        "answer": answer,
        "sources": sources,
        "retrieved_count": len(retrieved_docs),
        "is_rag": True,
        "is_ai": GEMINI_AVAILABLE
    }
