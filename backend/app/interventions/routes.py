from fastapi import APIRouter, Depends

from app.auth.utils import get_current_user
from app.database import journals
from app.engine.rumination import categorize
from app.escalation.service import open_flag, student_view
from app.interventions.engine import build_interventions

router = APIRouter(prefix="/api/interventions", tags=["interventions"])


@router.get("/current")
async def current_interventions(user=Depends(get_current_user)):
    """Intervention cards for wherever the student's latest entry landed —
    powers the Calm Space page and the Home screen nudge."""
    latest = await journals.find_one(
        {"user_id": user["_id"], "rumination_score": {"$ne": None}}, sort=[("created_at", -1)]
    )
    score = latest["rumination_score"] if latest else None
    cat = categorize(score)["key"] if score is not None else "calm"
    flag = student_view(await open_flag(user["_id"]))
    built = build_interventions(
        cat,
        mood=(latest or {}).get("mood_label", ""),
        triggers_hit=[t for t in (latest or {}).get("triggers_detected", []) if t in ((user.get("baseline") or {}).get("triggers") or [])],
        baseline=user.get("baseline"),
        music_prefs=user.get("music"),
        early_warning=bool(flag and flag["show_prompt"]),
    )
    return {"score": score, "category": categorize(score) if score is not None else None, **built}
