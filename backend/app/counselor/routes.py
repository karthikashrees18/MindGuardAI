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
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.admin.routes import _log_access
from app.auth.utils import require_role
from app.database import journals, users, warning_flags
from app.engine.rumination import TRIGGER_LABEL, categorize
from app.escalation.service import OPEN_STATUSES, alias_for

router = APIRouter(prefix="/api/counselor", tags=["counselor"])

WINDOW_DAYS = 30
RISK_ORDER = {"critical": 0, "moderate": 1, "stable": 2}


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
        cases.append({
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
