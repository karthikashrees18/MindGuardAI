"""
Mind Guard AI — backend
-----------------------
A single deployable FastAPI service.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.admin.routes import router as admin_router
from app.ai.routes import router as ai_router
from app.auth.routes import router as auth_router
from app.config import ALLOWED_ORIGINS, DEMO_MODE
from app.counselor.routes import router as counselor_router
from app.database import ensure_indexes
from app.demo.routes import router as demo_router
from app.auth.staff import ensure_counselor_account
from app.demo.seed import ensure_demo_data
from app.escalation.routes import router as support_router
from app.interventions.routes import router as interventions_router
from app.journal.routes import router as journal_router
from app.music.routes import router as music_router
from app.notifications.routes import router as notifications_router
from app.wellness.routes import router as wellness_router

logger = logging.getLogger("mindguard")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await ensure_indexes()
    await ensure_counselor_account()
    if DEMO_MODE:
        await ensure_demo_data()
        logger.info("DEMO_MODE on — demo personas, counselor/admin logins and cohort data are seeded.")
    yield


app = FastAPI(title="Mind Guard AI — Backend", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(journal_router)
app.include_router(ai_router)
app.include_router(notifications_router)
app.include_router(admin_router)
app.include_router(music_router)
app.include_router(interventions_router)
app.include_router(support_router)
app.include_router(counselor_router)
app.include_router(wellness_router)
app.include_router(demo_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "mind-guard-ai-backend", "demo_mode": DEMO_MODE}
