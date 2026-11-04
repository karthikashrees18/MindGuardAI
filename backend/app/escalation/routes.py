"""Student-facing side of the escalation protocol: see my early-warning
status, snooze the gentle prompt, or send a 1-click confidential connect
request to the campus counselor."""
import logging
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth.utils import get_current_user
from app.database import engagement_events, warning_flags
from app.escalation.service import alias_for, open_flag, snooze_until, student_view

logger = logging.getLogger("escalation")
router = APIRouter(prefix="/api/support", tags=["support"])


class ConnectRequest(BaseModel):
    channel: Literal["in_app", "email", "phone"] = "in_app"
    # Optional: how the counselor may reach me *outside* the app. Only stored,
    # and only shown to counselors, if share_identity is true.
    contact_detail: Optional[str] = Field(default=None, max_length=120)
    share_identity: bool = False
    note: Optional[str] = Field(default=None, max_length=500)


@router.get("/status")
async def support_status(user=Depends(get_current_user)):
    flag = await open_flag(user["_id"])
    return {"flag": student_view(flag)}


@router.post("/dismiss")
async def dismiss_prompt(user=Depends(get_current_user)):
    flag = await open_flag(user["_id"])
    if flag:
        await warning_flags.update_one({"_id": flag["_id"]}, {"$set": {"prompt_dismissed_until": snooze_until(6)}})
        flag["prompt_dismissed_until"] = snooze_until(6)
    return {"flag": student_view(flag)}


@router.post("/connect")
async def connect_with_counselor(body: ConnectRequest, user=Depends(get_current_user)):
    """1-click, confidential. If the student has no open early-warning flag the
    request still goes through (self-requested) — anyone may ask for help."""
    now = datetime.now(timezone.utc).isoformat()
    flag = await open_flag(user["_id"])
    connect = {
        "requested_at": now,
        "channel": body.channel,
        "share_identity": body.share_identity,
        "contact_detail": body.contact_detail if body.share_identity else None,
        "note": body.note,
    }
    if flag:
        await warning_flags.update_one({"_id": flag["_id"]}, {"$set": {"connect": connect, "updated_at": now}})
        flag["connect"] = connect
    else:
        flag = {
            "_id": str(uuid.uuid4()), "user_id": user["_id"], "status": "active",
            "severity": "moderate", "reason": "Student asked to talk to a counselor.",
            "scores": [], "created_at": now, "updated_at": now,
            "prompt_dismissed_until": None, "self_requested": True,
            "connect": connect, "actions": [],
        }
        await warning_flags.insert_one(flag)

    # Anonymous engagement counter feeding the admin "resource utilization" tile.
    await engagement_events.insert_one({"alert_type": "counselor", "created_at": now})

    # Heads-up SMS to the counselor line — alias only, never a name.
    try:
        from app.config import COUNSELOR_PHONE_NUMBER
        from app.notifications.routes import send_sms
        if COUNSELOR_PHONE_NUMBER:
            send_sms(COUNSELOR_PHONE_NUMBER,
                     f"Mind Guard AI: student {alias_for(user['_id'])} requested a confidential connect. Open the counselor portal.")
    except Exception as exc:  # never let a notification failure block the student
        logger.warning("counselor SMS failed: %s", exc)

    return {
        "ok": True,
        "message": "Request sent. A counselor will reach out through the channel you chose — you can keep using the app meanwhile.",
        "flag": student_view(flag),
    }
