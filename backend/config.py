import os
from dotenv import load_dotenv

load_dotenv()

APP_NAME = "Personal Finance Advisor Bot"
APP_VERSION = "1.0.0"
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finance_advisor.db")

SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-jwt-key-change-in-production-please")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
).split(",")

CURRENCY_SYMBOL = os.getenv("CURRENCY_SYMBOL", "₹")
COUNTRY = os.getenv("COUNTRY", "IN")
