"""Demo-mode helpers: one-click persona switching for the presentation.
All routes 404 when DEMO_MODE=0."""
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth.routes import user_out
from app.auth.utils import create_token
from app.config import DEMO_MODE
from app.database import users
from app.demo.seed import PERSONAS, reset_persona

router = APIRouter(prefix="/api/demo", tags=["demo"])

STAFF = {
    "counselor": {"email": "counselor@mindguard.ai", "label": "Counselor portal",
                  "tagline": "Dr. Priya Menon — sees alias-only risk queue and early-warning flags."},
}


def _require_demo():
    if not DEMO_MODE:
        raise HTTPException(status_code=404, detail="Demo mode is disabled.")


class PersonaRequest(BaseModel):
    persona: Literal["high", "calm", "counselor"]


@router.get("/personas")
async def personas():
    _require_demo()
    return {
        "personas": [
            {"key": p["key"], "label": p["label"], "tagline": p["tagline"], "name": p["name"], "role": "student"}
            for p in PERSONAS.values()
        ] + [
            {"key": k, "label": v["label"], "tagline": v["tagline"], "name": "Dr. Priya Menon", "role": "counselor"}
            for k, v in STAFF.items()
        ],
    }


@router.post("/login")
async def demo_login(body: PersonaRequest):
    """Returns a real JWT for the persona, so every downstream call behaves
    exactly as it would for a signed-in user."""
    _require_demo()
    email = PERSONAS[body.persona]["email"] if body.persona in PERSONAS else STAFF[body.persona]["email"]
    user = await users.find_one({"email": email})
    if not user:
        if body.persona in PERSONAS:
            await reset_persona(body.persona)
            user = await users.find_one({"email": email})
        else:
            raise HTTPException(status_code=503, detail="Demo accounts are still being created — retry in a few seconds.")
    return {"access_token": create_token(user["_id"]), "token_type": "bearer", "user": user_out(user)}


@router.post("/reset")
async def demo_reset(body: PersonaRequest):
    """Wipes and re-seeds a persona back to its pre-demo state."""
    _require_demo()
    if body.persona not in PERSONAS:
        raise HTTPException(status_code=422, detail="Only student personas can be reset.")
    user_id = await reset_persona(body.persona)
    user = await users.find_one({"_id": user_id})
    return {"access_token": create_token(user_id), "token_type": "bearer", "user": user_out(user)}
