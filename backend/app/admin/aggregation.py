"""
Aggregation helpers for the admin/counselor analytics dashboard.

Every function here is read-only and only ever returns grouped/averaged
numbers — no function in this module returns a raw journal document or a
raw student record. That split (individual PII lives in journal.py /
auth.py; this module only ever touches $group / $bucket / $facet output)
is the whole privacy story for the dashboard, and it's enforced by
construction: routes.py never imports `journals.find_one` or similar.
"""
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from app.config import K_ANONYMITY_THRESHOLD
from app.database import journals, users

Period = Literal["7d", "30d", "semester"]

# Rumination-score boundaries mapped onto the 4 cohort risk tiers used
# throughout the dashboard. Boundaries are upper-exclusive except the
# last, i.e. [0,26) Normal, [26,51) Mild, [51,76) Moderate, [76,100] High.
TIER_BOUNDARIES = [0, 26, 51, 76, 101]
TIER_LABELS = ["normal", "mild", "moderate", "high_distress"]

# Keyword sets used to derive "Top Reported Stress Factors" from journal
# text via a Mongo $facet (one $match + $count sub-pipeline per tag).
# This is a simple heuristic — same spirit as app/ai/scoring.py's
# keyword_score — not a claim of clinical accuracy.
STRESS_FACTOR_KEYWORDS: dict[str, list[str]] = {
    "Academic Workload": ["workload", "assignment", "deadline", "syllabus", "project due", "too much work"],
    "Exam Anxiety": ["exam", "viva", "mid ?sem", "end ?sem", "test anxiety"],
    "Sleep Disruption": ["can't sleep", "cant sleep", "sleepless", "insomnia", "sleep deprived", "no sleep", "up all night"],
    "Social Isolation": ["lonely", "isolated", "no friends", "left out", "no one to talk"],
    "Family Pressure": ["family pressure", "parents expect", "family expect", "disappoint my parents"],
    "Financial Stress": ["financial", "afford", "tuition", "fees", "money worries"],
    "Placement / Career Anxiety": ["placement", "interview", "job offer", "career", "internship"],
}


def period_start(period: Period, now: Optional[datetime] = None) -> datetime:
    now = now or datetime.now(timezone.utc)
    if period == "7d":
        return now - timedelta(days=7)
    if period == "30d":
        return now - timedelta(days=30)
    # "semester" — approximate as a rolling 16-week academic term.
    return now - timedelta(weeks=16)


def window_length(period: Period) -> timedelta:
    if period == "7d":
        return timedelta(days=7)
    if period == "30d":
        return timedelta(days=30)
    return timedelta(weeks=16)


def suppress_small_groups(buckets: list[dict], k_threshold: int = K_ANONYMITY_THRESHOLD) -> list[dict]:
    """Fold any bucket with fewer than k_threshold students into a single
    'Other / Insufficient Data' bucket so no chart segment can ever be
    small enough to imply a specific student. Applies k-anonymity on the
    *student_count* field of each bucket dict."""
    kept, suppressed_total = [], {
        "label": "Other / Insufficient Data",
        "student_count": 0,
        "risk_distribution": {"normal": 0, "mild": 0, "moderate": 0, "high_distress": 0},
        "suppressed": True,
    }
    any_suppressed = False
    for b in buckets:
        if b["student_count"] < k_threshold:
            any_suppressed = True
            suppressed_total["student_count"] += b["student_count"]
            for tier in TIER_LABELS:
                suppressed_total["risk_distribution"][tier] += b["risk_distribution"][tier]
        else:
            kept.append(b)
    if any_suppressed:
        kept.append(suppressed_total)
    return kept


async def per_student_tier_counts(since: datetime, until: Optional[datetime] = None,
                                   user_ids: Optional[list[str]] = None) -> dict:
    """Buckets each active student into a risk tier based on their average
    rumination_score in [since, until). Returns counts keyed by TIER_LABELS
    plus 'sample_size' (distinct students with >=1 entry in the window)."""
    match: dict = {"created_at": {"$gte": since.isoformat()}, "rumination_score": {"$ne": None}}
    if until is not None:
        match["created_at"]["$lt"] = until.isoformat()
    if user_ids is not None:
        match["user_id"] = {"$in": user_ids}

    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$user_id", "avg_score": {"$avg": "$rumination_score"}}},
        {"$bucket": {
            "groupBy": "$avg_score",
            "boundaries": TIER_BOUNDARIES,
            "default": "unscored",
            "output": {"count": {"$sum": 1}},
        }},
    ]
    counts = {label: 0 for label in TIER_LABELS}
    sample_size = 0
    async for row in journals.aggregate(pipeline):
        boundary = row["_id"]
        sample_size += row["count"]
        if boundary in TIER_BOUNDARIES[:-1]:
            idx = TIER_BOUNDARIES.index(boundary)
            counts[TIER_LABELS[idx]] += row["count"]
    return {"counts": counts, "sample_size": sample_size}


async def cohort_average_sentiment(since: datetime, until: Optional[datetime] = None,
                                    user_ids: Optional[list[str]] = None) -> Optional[float]:
    """Average sentiment (100 - rumination_score) across every journal
    entry in the window — the 'Campus Wellness Index'."""
    match: dict = {"created_at": {"$gte": since.isoformat()}, "rumination_score": {"$ne": None}}
    if until is not None:
        match["created_at"]["$lt"] = until.isoformat()
    if user_ids is not None:
        match["user_id"] = {"$in": user_ids}

    pipeline = [
        {"$match": match},
        {"$group": {"_id": None, "avg_rumination": {"$avg": "$rumination_score"}}},
    ]
    async for row in journals.aggregate(pipeline):
        return round(100 - row["avg_rumination"], 1)
    return None


async def total_active_students() -> int:
    return await users.count_documents({"role": {"$nin": ["admin", "counselor"]}})


async def department_of_users() -> dict[str, str]:
    """Maps user_id -> department label (or 'Unspecified') for every
    student, used to fold journals into department buckets in Python
    after a $lookup-free aggregate (cheaper than a $lookup for the
    dataset sizes this project targets)."""
    cursor = users.find({"role": {"$nin": ["admin", "counselor"]}}, {"_id": 1, "profile.department": 1})
    mapping = {}
    async for doc in cursor:
        dept = (doc.get("profile") or {}).get("department") or "Unspecified"
        mapping[doc["_id"]] = dept.strip() or "Unspecified"
    return mapping