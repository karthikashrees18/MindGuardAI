"""
The one pipeline every scored text goes through (check-in, venting box,
daily reflection, chat message):

   text -> Engine 1 (language signals) -> Engine 2 (personalised 0-100 score)
        -> store entry -> early-warning rules -> intervention cards -> garden
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.ai.analysis import analyze_entry
from app.database import journals
from app.escalation.service import evaluate, student_view
from app.interventions.engine import build_interventions
from app.wellness.service import garden_state


async def recent_scores(user_id: str, limit: int = 6) -> list[float]:
    cursor = journals.find(
        {"user_id": user_id, "rumination_score": {"$ne": None}},
        {"rumination_score": 1},
    ).sort("created_at", -1).limit(limit)
    return [d["rumination_score"] async for d in cursor]


async def process_entry(
    user: dict,
    text: str,
    mood: Optional[str] = None,
    stress_level: Optional[int] = None,
    source: str = "checkin",
    context: Optional[str] = None,
) -> dict:
    user_id = user["_id"]
    baseline = user.get("baseline") or {}
    music_prefs = user.get("music") or {}

    history = await recent_scores(user_id)
    analysis = await analyze_entry(text, stress_slider=stress_level, baseline=baseline, recent_scores=history, context=context)

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    first_today = await journals.count_documents({"user_id": user_id, "created_at": {"$gte": today_start}}) == 0

    doc = {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "text": text,
        "mood": mood,
        "stress_level": stress_level,
        "rumination_score": analysis["rumination_score"],
        "risk_level": analysis["risk_level"],
        "created_at": now.isoformat(),
        "source": source,
        "mood_label": analysis["mood"],
        "category": analysis["category"]["key"],
        "sentiment": analysis["sentiment"],
        "stress_intensity": analysis["stress_intensity"],
        "triggers_detected": analysis["triggers_detected"],
    }
    await journals.insert_one(doc)

    verdict = await evaluate(user_id, [analysis["rumination_score"]] + history)
    flag_view = student_view(verdict["flag"]) if verdict["flag"] else None
    early_warning = {
        "triggered": verdict["triggered"],
        "is_new": verdict["is_new"],
        "flag": flag_view,
        "show_prompt": bool(flag_view and flag_view["show_prompt"]),
    }

    interventions = build_interventions(
        analysis["category"]["key"],
        mood=analysis["mood"],
        triggers_hit=analysis["triggers_hit"],
        baseline=baseline,
        music_prefs=music_prefs,
        early_warning=early_warning["show_prompt"],
    )
    garden = await garden_state(user_id)
    return {
        "doc": doc,
        "analysis": analysis,
        "interventions": interventions,
        "early_warning": early_warning,
        "garden": garden,
        "first_checkin_today": first_today,
    }
