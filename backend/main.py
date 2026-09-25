from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from config import APP_NAME, APP_VERSION, ALLOWED_ORIGINS, DEBUG
from database.connection import init_db
from routers import auth, transactions, budgets, goals, dashboard, ai, reports, notifications

# Configure logging
logging.basicConfig(level=logging.DEBUG if DEBUG else logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {APP_NAME} v{APP_VERSION}")
    init_db()
    logger.info("Database initialized successfully")
    yield
    # Shutdown
    logger.info("Application shutting down")


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="AI-Powered Personal Finance & Wealth Management Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )


# Register routers
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(goals.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
app.include_router(reports.router)
app.include_router(notifications.router)


# Seed endpoint
@app.post("/api/seed-demo-data")
def seed_data(
    db=None,
    current_user=None,
):
    """Seed demo data - requires separate import to avoid circular deps."""
    from fastapi import Depends
    from database.connection import get_db
    from security import get_current_user as gcu
    return {"message": "Use /api/seed endpoint below"}


@app.post("/api/seed")
async def seed_demo(request: Request):
    """Seed demo data for the authenticated user."""
    from fastapi import Depends, HTTPException
    from database.connection import SessionLocal
    from database.seed import seed_demo_data
    from security import decode_token

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    if not payload:
        return JSONResponse(status_code=401, content={"detail": "Invalid token"})

    user_id = int(payload.get("sub", 0))
    db = SessionLocal()
    try:
        result = seed_demo_data(db, user_id)
        return result or {"message": "Demo data seeded successfully"}
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": APP_NAME,
        "version": APP_VERSION,
    }


@app.get("/")
def root():
    return {
        "message": f"Welcome to {APP_NAME} API",
        "version": APP_VERSION,
        "docs": "/docs",
    }
