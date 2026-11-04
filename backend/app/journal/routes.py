import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.utils import get_current_user
from app.database import journals
from app.engine.rumination import TRIGGER_LABEL, categorize
from app.journal.models import (
    CheckinRequest, CheckinResponse, JournalCreate, JournalOut, ReportsSummary,
)
from app.journal.service import process_entry

router = APIRouter(prefix="/api", tags=["journal"])


def to_out(doc) -> JournalOut:
    return JournalOut(
        id=doc["_id"],
        user_id=doc["user_id"],
        text=doc["text"],
        mood=doc.get("mood"),
        stress_level=doc.get("stress_level"),
        rumination_score=doc.get("rumination_score"),
        risk_level=doc.get("risk_level"),
        created_at=doc["created_at"],
        source=doc.get("source"),
        mood_label=doc.get("mood_label"),
        category=doc.get("category"),
        sentiment=doc.get("sentiment"),
        stress_intensity=doc.get("stress_intensity"),
        triggers_detected=doc.get("triggers_detected"),
    )


def _own(user: dict, user_id: Optional[str]) -> str:
    """Students may only touch their own entries. (Previously any caller could
    read or write any user_id.)"""
    if user_id and user_id != user["_id"]:
        raise HTTPException(status_code=403, detail="You can only access your own journal.")
    return user["_id"]


@router.post("/checkins", response_model=CheckinResponse)
async def create_checkin(body: CheckinRequest, user=Depends(get_current_user)):
    """Check-in / venting box / reflection. Runs both engines, stores the entry,
    applies the early-warning rules and returns intervention cards + garden."""
    result = await process_entry(user, body.text.strip(), body.mood, body.stress_level, body.source)
    return CheckinResponse(
        entry=to_out(result["doc"]),
        analysis=result["analysis"],
        interventions=result["interventions"],
        early_warning=result["early_warning"],
        garden=result["garden"],
        first_checkin_today=result["first_checkin_today"],
    )


@router.post("/journals", response_model=JournalOut)
async def create_journal(body: JournalCreate, user=Depends(get_current_user)):
    """Legacy raw-save endpoint, kept for compatibility. Prefer /api/checkins."""
    uid = _own(user, body.user_id)
    doc = {
        "_id": str(uuid.uuid4()),
        "user_id": uid,
        "text": body.text,
        "mood": body.mood,
        "stress_level": body.stress_level,
        "rumination_score": body.rumination_score,
        "risk_level": body.risk_level,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await journals.insert_one(doc)
    return to_out(doc)


@router.get("/journals", response_model=List[JournalOut])
async def list_journals(user_id: Optional[str] = Query(None), limit: int = 50, user=Depends(get_current_user)):
    uid = _own(user, user_id)
    cursor = journals.find({"user_id": uid}).sort("created_at", -1).limit(min(limit, 200))
    return [to_out(doc) async for doc in cursor]


@router.get("/journals/reports/summary", response_model=ReportsSummary)
async def reports_summary(user_id: Optional[str] = Query(None), user=Depends(get_current_user)):
    uid = _own(user, user_id)
    cursor = journals.find({"user_id": uid}).sort("created_at", -1).limit(30)
    docs = [doc async for doc in cursor]
    total = await journals.count_documents({"user_id": uid})

    scored = [d for d in docs if d.get("rumination_score") is not None]
    scored.reverse()
    scores = [d["rumination_score"] for d in scored]

    if len(scores) < 2:
        trend = "not enough data"
    else:
        half = len(scores) // 2
        first_avg = sum(scores[:half]) / half
        second_avg = sum(scores[half:]) / (len(scores) - half)
        if second_avg < first_avg - 3:
            trend = "easing"
        elif second_avg > first_avg + 3:
            trend = "rising"
        else:
            trend = "steady"

    cats = Counter(categorize(s)["key"] for s in scores)
    triggers = Counter(t for d in scored for t in (d.get("triggers_detected") or []))
    hours = Counter()
    for d in scored:
        if d["rumination_score"] <= 40:
            try:
                hours[datetime.fromisoformat(d["created_at"]).hour] += 1
            except ValueError:
                pass

    return ReportsSummary(
        total_entries=total,
        average_rumination_score=(sum(scores) / len(scores)) if scores else None,
        trend=trend,
        recent_scores=[round(s) for s in scores[-12:]],
        recent=[
            {"at": d["created_at"], "score": round(d["rumination_score"]), "category": categorize(d["rumination_score"])["key"],
             "mood": d.get("mood_label")}
            for d in scored[-30:]
        ],
        category_counts={"calm": cats["calm"], "mild": cats["mild"], "critical": cats["critical"]},
        top_triggers=[{"key": k, "label": TRIGGER_LABEL.get(k, k), "count": c} for k, c in triggers.most_common(5)],
        best_hour=hours.most_common(1)[0][0] if hours else None,
    )


@router.get("/journals/{journal_id}", response_model=JournalOut)
async def get_journal(journal_id: str, user=Depends(get_current_user)):
    doc = await journals.find_one({"_id": journal_id})
    if not doc or doc["user_id"] != user["_id"]:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return to_out(doc)
