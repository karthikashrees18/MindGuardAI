"""
Automated Early Warning protocol.

Rules (scores newest-first, `new` is the entry just analysed):
  CRITICAL  new >= 71                       one critical entry is enough
            or 2 of the last 3 entries >= 71
  MODERATE  last 3 entries all > 40 and their average >= 55
            (rumination that *persists* even when no single entry is extreme)

One open flag per student. A repeat trigger updates the open flag (adding to
its score trail, upgrading severity if needed) instead of spamming
counselors with duplicates.

Privacy: a flag stores only scores, a reason, the student's own consented
connect request and the counselor's follow-up actions — never journal text.
The counselor sees the student under a one-way alias (`alias_for`) until the
student chooses to share their identity in the connect request.
"""
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Sequence

from app.config import JWT_SECRET, SCORE_CALM_MAX, SCORE_MILD_MAX
from app.database import warning_flags

CRITICAL_MIN = SCORE_MILD_MAX + 1   # 71
OPEN_STATUSES = ("active", "in_progress")


def alias_for(user_id: str) -> str:
    """Stable, one-way pseudonym shown to counselors (MG-1A2B3). Salted with
    the server secret so it can't be reversed by hashing known user ids."""
    digest = hashlib.sha256(f"{JWT_SECRET}:{user_id}".encode()).hexdigest()
    return "MG-" + digest[:5].upper()


def classify(scores_newest_first: Sequence[float]) -> Optional[tuple[str, str]]:
    """Returns (severity, reason) or None."""
    seq = [s for s in scores_newest_first if s is not None]
    if not seq:
        return None
    if seq[0] >= CRITICAL_MIN:
        return "critical", f"High-distress entry ({round(seq[0])}/100)."
    last3 = seq[:3]
    if len(last3) >= 2 and sum(1 for s in last3 if s >= CRITICAL_MIN) >= 2:
        return "critical", "Repeated high-distress entries."
    if len(last3) == 3 and all(s > SCORE_CALM_MAX for s in last3) and sum(last3) / 3 >= 55:
        return "moderate", f"Rumination persisting across 3 entries (avg {round(sum(last3) / 3)}/100)."
    return None


async def open_flag(user_id: str) -> Optional[dict]:
    return await warning_flags.find_one({"user_id": user_id, "status": {"$in": list(OPEN_STATUSES)}})


async def evaluate(user_id: str, scores_newest_first: Sequence[float]) -> dict:
    """Call after every scored entry. Returns {triggered, is_new, flag|None}."""
    now = datetime.now(timezone.utc).isoformat()
    verdict = classify(scores_newest_first)
    existing = await open_flag(user_id)
    trail = [round(s) for s in scores_newest_first[:5] if s is not None]

    if verdict is None:
        return {"triggered": False, "is_new": False, "flag": existing}

    severity, reason = verdict
    if existing:
        updates = {"scores": trail, "updated_at": now, "reason": reason}
        if severity == "critical" and existing["severity"] != "critical":
            updates["severity"] = "critical"
            updates["prompt_dismissed_until"] = None   # re-surface the prompt on escalation
            existing["severity"] = "critical"
        await warning_flags.update_one({"_id": existing["_id"]}, {"$set": updates})
        existing.update(updates)
        return {"triggered": True, "is_new": False, "flag": existing}

    flag = {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "status": "active",
        "severity": severity,
        "reason": reason,
        "scores": trail,
        "created_at": now,
        "updated_at": now,
        "prompt_dismissed_until": None,
        "self_requested": False,
        "connect": None,
        "actions": [],
    }
    await warning_flags.insert_one(flag)
    return {"triggered": True, "is_new": True, "flag": flag}


def student_view(flag: Optional[dict]) -> Optional[dict]:
    """What the *student* may see about their own flag."""
    if not flag:
        return None
    dismissed = flag.get("prompt_dismissed_until")
    snoozed = bool(dismissed and dismissed > datetime.now(timezone.utc).isoformat())
    connect = flag.get("connect")
    updates = [
        {"type": a["type"], "note": a.get("note"), "scheduled_for": a.get("scheduled_for"),
         "by": a.get("by_name", "Your counselor"), "at": a["at"]}
        for a in flag.get("actions", []) if a["type"] in ("schedule", "outreach")
    ]
    return {
        "id": flag["_id"],
        "severity": flag["severity"],
        "status": flag["status"],
        "reason": flag.get("reason"),
        "connect_requested": bool(connect),
        "connect_requested_at": connect.get("requested_at") if connect else None,
        "show_prompt": (not connect) and (not snoozed) and flag["status"] in OPEN_STATUSES,
        "counselor_updates": updates,
    }


def snooze_until(hours: int = 6) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()
