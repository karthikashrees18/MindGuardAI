import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.auth.utils import require_role
from app.config import ANOMALY_CHANGE_THRESHOLD_PERCENT, K_ANONYMITY_THRESHOLD
from app.database import audit_logs, broadcasts, engagement_events, journals, users

from app.admin.aggregation import (
    Period, STRESS_FACTOR_KEYWORDS, TIER_LABELS,
    cohort_average_sentiment, department_of_users, per_student_tier_counts,
    period_start, suppress_small_groups, total_active_students, window_length,
)
from app.admin.models import (
    AggregateStatsResponse, AnomalyAlert, BroadcastCreate, BroadcastOut,
    CohortTrendsResponse, DepartmentBreakdownResponse, DepartmentBucket,
    KpiSummary, ResourceUtilization, RiskTierCounts, RiskTierPercent,
    StressFactor, StressFactorsResponse, TrendPoint,
)

router = APIRouter(prefix="/api/admin", tags=["admin-analytics"])
# Every route below also declares its own `user=Depends(require_role(...))`
# rather than relying only on a router-wide dependency, because each
# handler needs the resolved `user` dict for audit logging anyway — that
# same dependency call is what actually enforces the 403 for non
# admin/counselor tokens.


async def _log_access(user: dict, endpoint: str, params: dict):
    """Every admin/counselor read of aggregate analytics is recorded —
    who, what endpoint, what filters, when — for institutional
    (NAAC/VTU/UGC-style) compliance review. Never records which student
    records contributed to the numbers, because the numbers themselves
    never carry that information past this point."""
    await audit_logs.insert_one({
        "_id": str(uuid.uuid4()),
        "actor_id": user["_id"],
        "actor_name": user.get("name", "unknown"),
        "endpoint": endpoint,
        "params": params,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


def _counts_to_model(counts: dict) -> RiskTierCounts:
    return RiskTierCounts(**counts)


def _counts_to_percent(counts: dict, total: int) -> RiskTierPercent:
    if total <= 0:
        return RiskTierPercent()
    return RiskTierPercent(**{k: round(v / total * 100, 1) for k, v in counts.items()})


@router.get("/aggregate-stats", response_model=AggregateStatsResponse)
async def aggregate_stats(period: Period = Query("7d"), user=Depends(require_role("admin", "counselor"))):
    since = period_start(period)
    tier_result = await per_student_tier_counts(since)
    counts = tier_result["counts"]
    sample_size = tier_result["sample_size"]

    wellness_index = await cohort_average_sentiment(since)
    active_students = await total_active_students()

    high_moderate = counts["moderate"] + counts["high_distress"]
    high_moderate_pct = round(high_moderate / sample_size * 100, 1) if sample_size else 0.0

    week_ago = period_start("7d")
    weekly_checkins = len(await journals.distinct("user_id", {"created_at": {"$gte": week_ago.isoformat()}}))
    checkin_rate = round(weekly_checkins / active_students * 100, 1) if active_students else 0.0

    anomalies = await _detect_anomalies(period)

    await _log_access(user, "/api/admin/aggregate-stats", {"period": period})

    return AggregateStatsResponse(
        period=period,
        sample_size=sample_size,
        kpis=KpiSummary(
            total_active_students=active_students,
            wellness_index=wellness_index,
            high_moderate_risk_percent=high_moderate_pct,
            weekly_checkin_completion_rate=checkin_rate,
        ),
        risk_distribution=_counts_to_model(counts),
        risk_distribution_percent=_counts_to_percent(counts, sample_size),
        anomalies=anomalies,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


async def _detect_anomalies(period: Period) -> list[AnomalyAlert]:
    """Compares this window's distress index against the immediately
    preceding equal-length window, per department, and flags any swing
    past ANOMALY_CHANGE_THRESHOLD_PERCENT — both windows must independently
    clear the k-anonymity threshold or the department is skipped entirely."""
    length = window_length(period)
    now = datetime.now(timezone.utc)
    current_start = now - length
    previous_start = current_start - length

    dept_map = await department_of_users()
    if not dept_map:
        return []

    current = await _department_avg_distress(dept_map, current_start, now)
    previous = await _department_avg_distress(dept_map, previous_start, current_start)

    alerts = []
    for dept, (avg_now, n_now) in current.items():
        prev = previous.get(dept)
        if n_now < K_ANONYMITY_THRESHOLD or prev is None or prev[1] < K_ANONYMITY_THRESHOLD or prev[0] in (None, 0):
            continue
        if avg_now is None:
            continue
        change = (avg_now - prev[0]) / prev[0] * 100
        if abs(change) >= ANOMALY_CHANGE_THRESHOLD_PERCENT:
            direction = "increased" if change > 0 else "decreased"
            alerts.append(AnomalyAlert(
                group=dept,
                change_percent=round(change, 1),
                message=f"{dept} distress index {direction} by {abs(round(change, 1))}% vs. the previous period.",
            ))
    return alerts


async def _department_avg_distress(dept_map: dict, since: datetime, until: datetime) -> dict:
    """Returns {department: (avg_rumination_score, distinct_student_count)}
    for journals in [since, until)."""
    pipeline = [
        {"$match": {
            "created_at": {"$gte": since.isoformat(), "$lt": until.isoformat()},
            "rumination_score": {"$ne": None},
        }},
        {"$group": {"_id": "$user_id", "avg_score": {"$avg": "$rumination_score"}}},
    ]
    per_dept_scores: dict[str, list[float]] = {}
    async for row in journals.aggregate(pipeline):
        dept = dept_map.get(row["_id"], "Unspecified")
        per_dept_scores.setdefault(dept, []).append(row["avg_score"])
    return {
        dept: (sum(scores) / len(scores), len(scores))
        for dept, scores in per_dept_scores.items()
    }


@router.get("/cohort-trends", response_model=CohortTrendsResponse)
async def cohort_trends(period: Period = Query("30d"), user=Depends(require_role("admin", "counselor"))):
    since = period_start(period)
    pipeline = [
        {"$match": {"created_at": {"$gte": since.isoformat()}, "rumination_score": {"$ne": None}}},
        {"$addFields": {"day": {"$substrCP": ["$created_at", 0, 10]}}},
        {"$group": {
            "_id": "$day",
            "avg_rumination": {"$avg": "$rumination_score"},
            "entry_count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    points = [
        TrendPoint(
            date=row["_id"],
            average_sentiment=round(100 - row["avg_rumination"], 1),
            entry_count=row["entry_count"],
        )
        async for row in journals.aggregate(pipeline)
    ]

    await _log_access(user, "/api/admin/cohort-trends", {"period": period})
    return CohortTrendsResponse(period=period, points=points)


@router.get("/department-breakdown", response_model=DepartmentBreakdownResponse)
async def department_breakdown(
    period: Period = Query("30d"),
    group_by: str = Query("department", pattern="^(department|year_of_study)$"),
    user=Depends(require_role("admin", "counselor")),
):
    since = period_start(period)

    field = "profile.department" if group_by == "department" else "profile.year_of_study"
    cursor = users.find({"role": {"$nin": ["admin", "counselor"]}}, {"_id": 1, field: 1})
    label_map: dict[str, str] = {}
    async for doc in cursor:
        node = doc.get("profile") or {}
        value = node.get("department" if group_by == "department" else "year_of_study")
        label_map[doc["_id"]] = (value or "Unspecified").strip() or "Unspecified"

    tier_pipeline = [
        {"$match": {"created_at": {"$gte": since.isoformat()}, "rumination_score": {"$ne": None}}},
        {"$group": {"_id": "$user_id", "avg_score": {"$avg": "$rumination_score"}}},
    ]

    grouped: dict[str, dict] = {}
    async for row in journals.aggregate(tier_pipeline):
        label = label_map.get(row["_id"], "Unspecified")
        bucket = grouped.setdefault(label, {
            "label": label, "student_count": 0,
            "risk_distribution": {t: 0 for t in TIER_LABELS}, "suppressed": False,
        })
        bucket["student_count"] += 1
        score = row["avg_score"]
        if score < 26:
            bucket["risk_distribution"]["normal"] += 1
        elif score < 51:
            bucket["risk_distribution"]["mild"] += 1
        elif score < 76:
            bucket["risk_distribution"]["moderate"] += 1
        else:
            bucket["risk_distribution"]["high_distress"] += 1

    buckets = suppress_small_groups(list(grouped.values()), K_ANONYMITY_THRESHOLD)
    buckets.sort(key=lambda b: b["student_count"], reverse=True)

    await _log_access(user, "/api/admin/department-breakdown", {"period": period, "group_by": group_by})

    return DepartmentBreakdownResponse(
        period=period,
        group_by=group_by,
        k_threshold=K_ANONYMITY_THRESHOLD,
        buckets=[DepartmentBucket(**b) for b in buckets],
    )


@router.get("/stress-factors", response_model=StressFactorsResponse)
async def stress_factors(period: Period = Query("30d"), user=Depends(require_role("admin", "counselor"))):
    since = period_start(period)
    base_match = {"created_at": {"$gte": since.isoformat()}, "text": {"$exists": True, "$ne": ""}}

    facet_stage = {}
    for tag, keywords in STRESS_FACTOR_KEYWORDS.items():
        regex = "|".join(keywords)
        facet_stage[tag] = [
            {"$match": {**base_match, "text": {"$regex": regex, "$options": "i"}}},
            {"$count": "count"},
        ]

    pipeline = [{"$facet": facet_stage}]
    result = await journals.aggregate(pipeline).to_list(length=1)
    raw = result[0] if result else {}

    factors = []
    for tag in STRESS_FACTOR_KEYWORDS:
        rows = raw.get(tag) or []
        count = rows[0]["count"] if rows else 0
        # k-anonymity: don't surface a stress-factor tag that could only
        # have come from a handful of journal entries.
        if count >= K_ANONYMITY_THRESHOLD:
            factors.append(StressFactor(tag=tag, count=count))
    factors.sort(key=lambda f: f.count, reverse=True)

    await _log_access(user, "/api/admin/stress-factors", {"period": period})
    return StressFactorsResponse(period=period, k_threshold=K_ANONYMITY_THRESHOLD, factors=factors)


@router.get("/resource-utilization", response_model=ResourceUtilization)
async def resource_utilization(period: Period = Query("30d"), user=Depends(require_role("admin", "counselor"))):
    since = period_start(period)
    match = {"created_at": {"$gte": since.isoformat()}}

    async def count_type(alert_type: str) -> int:
        return await engagement_events.count_documents({**match, "alert_type": alert_type})

    result = ResourceUtilization(
        period=period,
        helpline_taps=await count_type("helpline"),
        counselor_contacts=await count_type("counselor"),
        trusted_contact_alerts=await count_type("trusted_contact"),
    )
    await _log_access(user, "/api/admin/resource-utilization", {"period": period})
    return result


@router.post("/broadcast-resource", response_model=BroadcastOut)
async def create_broadcast(body: BroadcastCreate, user=Depends(require_role("admin", "counselor"))):
    doc = {
        "_id": str(uuid.uuid4()),
        "title": body.title,
        "message": body.message,
        "target_group": body.target_group,
        "created_by": user.get("name", "Counselor"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await broadcasts.insert_one(doc)
    await _log_access(user, "/api/admin/broadcast-resource", {"target_group": body.target_group})
    return BroadcastOut(id=doc["_id"], **{k: doc[k] for k in ("title", "message", "target_group", "created_by", "created_at")})


@router.get("/broadcast-resource", response_model=list[BroadcastOut])
async def list_broadcasts(limit: int = 20, user=Depends(require_role("admin", "counselor"))):
    cursor = broadcasts.find().sort("created_at", -1).limit(limit)
    out = []
    async for doc in cursor:
        out.append(BroadcastOut(
            id=doc["_id"], title=doc["title"], message=doc["message"],
            target_group=doc["target_group"], created_by=doc["created_by"], created_at=doc["created_at"],
        ))
    return out


@router.get("/export/summary.csv")
async def export_summary_csv(period: Period = Query("30d"), user=Depends(require_role("admin", "counselor"))):
    """Sanitized, zero-PII CSV summary for institutional accreditation
    reporting (NAAC/VTU/UGC-style). Every row is an aggregate figure —
    no student identifier, journal text, or contact info ever appears
    in this export."""
    since = period_start(period)
    tier_result = await per_student_tier_counts(since)
    counts = tier_result["counts"]
    wellness_index = await cohort_average_sentiment(since)
    active_students = await total_active_students()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Mind Guard AI — Cohort Wellness Summary (zero-PII, k-anonymized)"])
    writer.writerow(["Generated at (UTC)", datetime.now(timezone.utc).isoformat()])
    writer.writerow(["Reporting period", period])
    writer.writerow([])
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Total active enrolled students", active_students])
    writer.writerow(["Campus wellness index (0-100)", wellness_index if wellness_index is not None else "n/a"])
    writer.writerow(["Students — Normal", counts["normal"]])
    writer.writerow(["Students — Mild", counts["mild"]])
    writer.writerow(["Students — Moderate", counts["moderate"]])
    writer.writerow(["Students — High Distress", counts["high_distress"]])
    writer.writerow(["K-anonymity threshold applied", K_ANONYMITY_THRESHOLD])
    buf.seek(0)

    await _log_access(user, "/api/admin/export/summary.csv", {"period": period})
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=mindguard_cohort_summary_{period}.csv"},
    )


@router.get("/audit-log", response_model=list)
async def get_audit_log(limit: int = 50, user=Depends(require_role("admin"))):
    """Admin-only (not counselor) — who queried what, and when."""
    cursor = audit_logs.find().sort("created_at", -1).limit(limit)
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return out