import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, Query

from app.database import journals
from app.journal.models import JournalCreate, JournalOut, ReportsSummary

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
    )


@router.post("/journals", response_model=JournalOut)
async def create_journal(body: JournalCreate):
    doc = {
        "_id": str(uuid.uuid4()),
        "user_id": body.user_id,
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
async def list_journals(user_id: str = Query(...), limit: int = 50):
    cursor = journals.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    return [to_out(doc) async for doc in cursor]


@router.get("/journals/reports/summary", response_model=ReportsSummary)
async def reports_summary(user_id: str = Query(...)):
    cursor = journals.find({"user_id": user_id}).sort("created_at", -1).limit(30)
    docs = [doc async for doc in cursor]
    total = await journals.count_documents({"user_id": user_id})

    scores = [d["rumination_score"] for d in docs if d.get("rumination_score") is not None]
    scores.reverse()

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

    return ReportsSummary(
        total_entries=total,
        average_rumination_score=(sum(scores) / len(scores)) if scores else None,
        trend=trend,
        recent_scores=scores[-12:],
    )


@router.get("/journals/{journal_id}", response_model=JournalOut)
async def get_journal(journal_id: str):
    doc = await journals.find_one({"_id": journal_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return to_out(doc)
