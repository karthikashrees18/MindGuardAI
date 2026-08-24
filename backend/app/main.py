"""
Mind Guard AI — backend
-----------------------
A single deployable FastAPI service, organized internally by feature
module (auth / journal / ai / notifications) so different teammates can
own a module each without the app being split into separate deployable
services. Everything shares one Mongo database (see app/database.py).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.routes import router as auth_router
from app.journal.routes import router as journal_router
from app.ai.routes import router as ai_router
from app.notifications.routes import router as notifications_router
from app.admin.routes import router as admin_router

app = FastAPI(title="Mind Guard AI — Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(journal_router)
app.include_router(ai_router)
app.include_router(notifications_router)
app.include_router(admin_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "mind-guard-ai-backend"}