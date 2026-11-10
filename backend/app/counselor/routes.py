"""
Counselor portal API.

Individual-level but privacy-preserving:
  * students appear under a one-way alias (MG-XXXXX), never a name
  * only scores/trends/trigger-tags are exposed — NEVER journal or chat text
  * a student's name + contact channel are revealed only if *they* ticked
    "share my identity" in their connect request
  * every call is written to the audit log

(The cohort-level, k-anonymised analytics stay in app/admin.)
"""
import base64
import hashlib
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.admin.routes import _log_access
from app.auth.utils import require_role
from app.config import JWT_SECRET, K_ANONYMITY_THRESHOLD
from app.database import counselor_notes, journals, users, warning_flags
from app.engine.rumination import TRIGGER_LABEL, categorize
from app.escalation.service import OPEN_STATUSES, alias_for

router = APIRouter(prefix="/api/counselor", tags=["counselor"])

WINDOW_DAYS = 30
RISK_ORDER = {"critical": 0, "moderate": 1, "stable": 2}


_FERNET = Fernet(base64.urlsafe_b64encode(hashlib.sha256(("notes:" + JWT_SECRET).encode()).digest()))


def _distress_tags(latest, avg_7d, trend, triggers: Counter) -> list[str]:
    """Categorical, privacy-preserving markers inferred from scores and trigger tags.
    Never derived from, or containing, journal text."""
    tags = []
    if latest is not None and latest >= 71:
        tags.append("High rumination")
    elif avg_7d is not None and avg_7d >= 56:
        tags.append("Sustained stress")
    if trend == "rising":
        tags.append("Rising distress")
    tags += [TRIGGER_LABEL.get(k, k.replace("_", " ").title()) for k, _ in triggers.most_common(2)]
    return tags[:4]


def _risk(flag: Optional[dict], last3: list[float]) -> str:
    open_ = flag and flag["status"] in OPEN_STATUSES
    avg3 = sum(last3) / len(last3) if last3 else 0
    if (open_ and flag["severity"] == "critical") or (len(last3) >= 2 and avg3 >= 71):
        return "critical"
    if open_ or (len(last3) >= 3 and avg3 >= 56):
        return "moderate"
    return "stable"


def _trend(scores_chrono: list[float]) -> str:
    if len(scores_chrono) < 4:
        return "new"
    half = len(scores_chrono) // 2
    a = sum(scores_chrono[:half]) / half
    b = sum(scores_chrono[half:]) / (len(scores_chrono) - half)
    return "rising" if b > a + 5 else "easing" if b < a - 5 else "steady"


def _identity(user: Optional[dict], flag: Optional[dict]) -> Optional[dict]:
    connect = (flag or {}).get("connect")
    if not (user and connect and connect.get("share_identity")):
        return None
    profile = user.get("profile") or {}
    return {
        "name": profile.get("preferred_name") or user.get("name"),
        "email": user.get("email"),
        "channel": connect.get("channel"),
        "contact_detail": connect.get("contact_detail"),
        "department": profile.get("department"),
        "year_of_study": profile.get("year_of_study"),
    }


def _flag_public(flag: Optional[dict]) -> Optional[dict]:
    if not flag:
        return None
    connect = flag.get("connect")
    return {
        "id": flag["_id"],
        "severity": flag["severity"],
        "status": flag["status"],
        "reason": flag.get("reason"),
        "created_at": flag["created_at"],
        "updated_at": flag.get("updated_at"),
        "self_requested": flag.get("self_requested", False),
        "connect_requested": bool(connect),
        "connect_requested_at": connect.get("requested_at") if connect else None,
        "connect_channel": connect.get("channel") if connect else None,
        "student_note": connect.get("note") if connect else None,
        "actions": [
            {k: a.get(k) for k in ("id", "type", "note", "scheduled_for", "by_name", "at")}
            for a in flag.get("actions", [])
        ],
    }


async def _load_cases() -> list[dict]:
    since = (datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)).isoformat()
    by_user: dict[str, list[dict]] = defaultdict(list)
    async for doc in journals.find(
        {"created_at": {"$gte": since}, "rumination_score": {"$ne": None}},
        {"user_id": 1, "created_at": 1, "rumination_score": 1, "triggers_detected": 1},
    ).sort("created_at", 1):
        by_user[doc["user_id"]].append(doc)
    recent_cut = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()

    flags: dict[str, dict] = {}
    async for f in warning_flags.find({"status": {"$in": list(OPEN_STATUSES)}}):
        flags[f["user_id"]] = f

    # Students flagged but with no recent scored entries (self-requested) still need to show up.
    ids = set(by_user) | set(flags)
    user_docs: dict[str, dict] = {}
    async for u in users.find({"_id": {"$in": list(ids)}, "role": {"$nin": ["admin", "counselor"]}}):
        user_docs[u["_id"]] = u

    cases = []
    two_weeks = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    week = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    for uid in ids:
        if uid not in user_docs:
            continue
        entries = by_user.get(uid, [])
        chrono = [e["rumination_score"] for e in entries]
        last3 = list(reversed(chrono))[:3]
        flag = flags.get(uid)
        last_week = [e["rumination_score"] for e in entries if e["created_at"] >= week]
        spark_entries = [e for e in entries if e["created_at"] >= two_weeks]
        risk = _risk(flag, last3)
        latest = entries[-1] if entries else None
        avg_7d_v = round(sum(last_week) / len(last_week)) if last_week else None
        trig = Counter(t for e in entries if e["created_at"] >= recent_cut for t in (e.get("triggers_detected") or []))
        trend_key = _trend([e["rumination_score"] for e in spark_entries])
        profile = user_docs[uid].get("profile") or {}
        cases.append({
            "department": profile.get("department"),
            "year_of_study": profile.get("year_of_study"),
            "tags": _distress_tags(round(latest["rumination_score"]) if latest else None, avg_7d_v, trend_key, trig),
            "alias": alias_for(uid),
            "risk": risk,
            "latest_score": round(latest["rumination_score"]) if latest else None,
            "latest_category": categorize(latest["rumination_score"])["label"] if latest else None,
            "latest_at": latest["created_at"] if latest else None,
            "avg_7d": round(sum(last_week) / len(last_week)) if last_week else None,
            "trend": _trend([e["rumination_score"] for e in spark_entries]),
            "sparkline": [round(e["rumination_score"]) for e in spark_entries][-14:],
            "entries_14d": len(spark_entries),
            "flag": _flag_public(flag),
            "identity": _identity(user_docs[uid], flag),
            "_uid": uid,
        })
    cases.sort(key=lambda c: (
        RISK_ORDER[c["risk"]],
        0 if (c["flag"] and c["flag"]["connect_requested"]) else 1,
        -(c["latest_score"] or 0),
    ))
    return cases


def _strip(case: dict) -> dict:
    return {k: v for k, v in case.items() if k != "_uid"}


@router.get("/summary")
async def summary(user=Depends(require_role("admin", "counselor"))):
    cases = await _load_cases()
    await _log_access(user, "/api/counselor/summary", {})
    return {
        "critical": sum(1 for c in cases if c["risk"] == "critical"),
        "moderate": sum(1 for c in cases if c["risk"] == "moderate"),
        "stable": sum(1 for c in cases if c["risk"] == "stable"),
        "connect_requests": sum(1 for c in cases if c["flag"] and c["flag"]["connect_requested"] and c["flag"]["status"] in OPEN_STATUSES),
        "monitored": len(cases),
    }


def _day(iso: str) -> str:
    return iso[:10]


@router.get("/overview")
async def overview(days: int = Query(7, ge=1, le=365), department: Optional[str] = None,
                   user=Depends(require_role("admin", "counselor"))):
    """Executive KPIs, a campus distress trend and the stressor breakdown.
    Everything here is aggregate and k-anonymised: a day or stressor backed by
    fewer than K_ANONYMITY_THRESHOLD students is suppressed, never shown."""
    now = datetime.now(timezone.utc)
    all_cases = await _load_cases()
    cases = [c for c in all_cases if not department or c["department"] == department]
    monitored = len(cases)
    day_ago = (now - timedelta(hours=24)).isoformat()

    def kpi(items, new_24h):
        return {"count": len(items), "pct": round(100 * len(items) / monitored) if monitored else 0, "new_24h": new_24h}

    def fresh(items):
        return sum(1 for c in items if c["flag"] and c["flag"]["created_at"] >= day_ago)

    crit = [c for c in cases if c["risk"] == "critical"]
    mod = [c for c in cases if c["risk"] == "moderate"]
    stable = [c for c in cases if c["risk"] == "stable"]
    open_connect = [c for c in cases if c["flag"] and c["flag"]["connect_requested"] and c["flag"]["status"] in OPEN_STATUSES]

    # campus trend: one point per day for the last 7 days (30 for longer windows)
    chart_days = 7 if days <= 7 else 30
    start = (now - timedelta(days=chart_days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    base_start = start - timedelta(days=30)
    dept_ids = None
    if department:
        dept_ids = {u["_id"] async for u in users.find(
            {"role": {"$nin": ["admin", "counselor"]}, "profile.department": department}, {"_id": 1})}
    per_day: dict[str, dict] = defaultdict(lambda: {"scores": [], "students": set()})
    base_scores, base_students = [], set()
    span_triggers: dict[str, set] = defaultdict(set)
    span_start = (now - timedelta(days=days)).isoformat()
    async for e in journals.find(
        {"created_at": {"$gte": base_start.isoformat()}, "rumination_score": {"$ne": None}, "source": {"$ne": "chat"}},
        {"user_id": 1, "created_at": 1, "rumination_score": 1, "triggers_detected": 1},
    ):
        if dept_ids is not None and e["user_id"] not in dept_ids:
            continue
        if e["created_at"] >= start.isoformat():
            d = per_day[_day(e["created_at"])]
            d["scores"].append(e["rumination_score"])
            d["students"].add(e["user_id"])
        else:
            base_scores.append(e["rumination_score"])
            base_students.add(e["user_id"])
        if e["created_at"] >= span_start:
            for t in e.get("triggers_detected") or []:
                span_triggers[t].add(e["user_id"])

    baseline = round(sum(base_scores) / len(base_scores)) if len(base_students) >= K_ANONYMITY_THRESHOLD else None
    trend = []
    for i in range(chart_days):
        day = (start + timedelta(days=i)).date().isoformat()
        d = per_day.get(day)
        ok = bool(d) and len(d["students"]) >= K_ANONYMITY_THRESHOLD
        avg = round(sum(d["scores"]) / len(d["scores"])) if ok else None
        trend.append({"date": day, "stress": avg, "wellness": None if avg is None else 100 - avg, "baseline": baseline})

    stressors = sorted(
        ({"key": k, "label": TRIGGER_LABEL.get(k, k.replace("_", " ").title()), "students": len(v)}
         for k, v in span_triggers.items() if len(v) >= K_ANONYMITY_THRESHOLD),
        key=lambda s: -s["students"])[:6]

    depts = sorted({c["department"] for c in all_cases if c["department"]})
    await _log_access(user, "/api/counselor/overview", {"days": days, "department": department})
    return {
        "monitored": monitored,
        "critical": kpi(crit, fresh(crit)),
        "moderate": kpi(mod, fresh(mod)),
        "stable": kpi(stable, 0),
        "connect_requests": {"count": len(open_connect),
                             "pct": round(100 * len(open_connect) / monitored) if monitored else 0, "new_24h": 0},
        "in_review": sum(1 for c in cases if c["flag"] and c["flag"]["status"] == "in_progress"),
        "trend": trend,
        "baseline": baseline,
        "stressors": stressors,
        "departments": depts,
        "k_threshold": K_ANONYMITY_THRESHOLD,
    }


@router.get("/cases")
async def list_cases(risk: Optional[Literal["critical", "moderate", "stable"]] = None,
                     user=Depends(require_role("admin", "counselor"))):
    cases = await _load_cases()
    if risk:
        cases = [c for c in cases if c["risk"] == risk]
    await _log_access(user, "/api/counselor/cases", {"risk": risk})
    return [_strip(c) for c in cases]


@router.get("/cases/{alias}")
async def case_detail(alias: str, user=Depends(require_role("admin", "counselor"))):
    cases = await _load_cases()
    case = next((c for c in cases if c["alias"] == alias), None)
    if not case:
        raise HTTPException(404, "Case not found")
    uid = case["_uid"]
    since = (datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)).isoformat()
    trend, cats, triggers = [], Counter(), Counter()
    async for e in journals.find(
        {"user_id": uid, "created_at": {"$gte": since}, "rumination_score": {"$ne": None}},
        {"created_at": 1, "rumination_score": 1, "triggers_detected": 1, "mood": 1, "stress_level": 1},
    ).sort("created_at", 1):
        cat = categorize(e["rumination_score"])
        trend.append({"at": e["created_at"], "score": round(e["rumination_score"]), "category": cat["key"],
                      "stress_slider": e.get("stress_level")})
        cats[cat["key"]] += 1
        for t in e.get("triggers_detected") or []:
            triggers[t] += 1
    await _log_access(user, "/api/counselor/cases/{alias}", {"alias": alias})
    return {
        **_strip(case),
        "trend": trend,
        "category_counts": {"calm": cats["calm"], "mild": cats["mild"], "critical": cats["critical"]},
        "top_triggers": [{"key": k, "label": TRIGGER_LABEL.get(k, k), "count": c} for k, c in triggers.most_common(5)],
        "privacy_note": ("Journal and chat text is never shown here. "
                         + ("This student chose to share their identity." if case["identity"]
                            else "Identity is hidden unless the student shares it. Use an in-app outreach message — it reaches them confidentially.")),
    }


class CaseAction(BaseModel):
    type: Literal["reviewed", "schedule", "outreach", "resolve"]
    note: Optional[str] = Field(default=None, max_length=500)
    scheduled_for: Optional[str] = Field(default=None, max_length=40)  # ISO datetime for type=schedule


@router.post("/cases/{alias}/actions")
async def case_action(alias: str, body: CaseAction, user=Depends(require_role("admin", "counselor"))):
    cases = await _load_cases()
    case = next((c for c in cases if c["alias"] == alias), None)
    if not case or not case["flag"]:
        raise HTTPException(404, "No open early-warning flag for this case")
    if body.type == "schedule" and not body.scheduled_for:
        raise HTTPException(422, "scheduled_for is required when scheduling")

    now = datetime.now(timezone.utc).isoformat()
    action = {
        "id": str(uuid.uuid4()),
        "type": body.type,
        "note": body.note,
        "scheduled_for": body.scheduled_for,
        "by_id": user["_id"],
        "by_name": user.get("name", "Counselor"),
        "at": now,
    }
    status = "resolved" if body.type == "resolve" else "in_progress"
    await warning_flags.update_one(
        {"_id": case["flag"]["id"]},
        {"$push": {"actions": action}, "$set": {"status": status, "updated_at": now}},
    )
    await _log_access(user, "/api/counselor/cases/{alias}/actions", {"alias": alias, "type": body.type})
    return {"ok": True, "status": status}


class NoteIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


async def _uid_for(alias: str) -> str:
    case = next((c for c in await _load_cases() if c["alias"] == alias), None)
    if not case:
        raise HTTPException(404, "Case not found")
    return case["_uid"]


def _decrypt(token: str) -> str:
    try:
        return _FERNET.decrypt(token.encode()).decode()
    except InvalidToken:
        return "[unreadable note]"


@router.get("/cases/{alias}/notes")
async def list_notes(alias: str, user=Depends(require_role("admin", "counselor"))):
    """Private counselor notes for one student (encrypted at rest)."""
    doc = await counselor_notes.find_one({"_id": await _uid_for(alias)})
    await _log_access(user, "/api/counselor/cases/{alias}/notes", {"alias": alias, "op": "read"})
    return [{"id": n["id"], "text": _decrypt(n["text"]), "by_name": n["by_name"], "at": n["at"]}
            for n in reversed((doc or {}).get("notes", []))]


@router.post("/cases/{alias}/notes")
async def add_note(alias: str, body: NoteIn, user=Depends(require_role("admin", "counselor"))):
    uid = await _uid_for(alias)
    note = {"id": str(uuid.uuid4()), "text": _FERNET.encrypt(body.text.strip().encode()).decode(),
            "by_name": user.get("name", "Counselor"), "at": datetime.now(timezone.utc).isoformat()}
    await counselor_notes.update_one({"_id": uid}, {"$push": {"notes": note}}, upsert=True)
    await _log_access(user, "/api/counselor/cases/{alias}/notes", {"alias": alias, "op": "write"})
    return {"id": note["id"], "text": body.text.strip(), "by_name": note["by_name"], "at": note["at"]}
