"""In-app direct messages between any two signed-in accounts (students,
counselors and admins). Everyone can see the full account directory and
start a conversation; either side can block or report the other.

Works with both the student token and the counselor/admin token — they are
the same JWT issued by /api/auth/login, so `get_current_user` covers both.
Clients poll; there is no websocket.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth.utils import get_current_user
from app.database import blocks, direct_messages, reports, users

logger = logging.getLogger("messages")
router = APIRouter(prefix="/api/messages", tags=["messages"])

ROLE_LABELS = {"student": "Student", "counselor": "Counselor", "admin": "Admin"}


class SendBody(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class ReportBody(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


def _now():
    return datetime.now(timezone.utc)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:  # Mongo hands back naive UTC datetimes
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _pair(a: str, b: str) -> str:
    """Stable conversation key for two user ids."""
    return "|".join(sorted((a, b)))


def _message_out(m: dict, me: str) -> dict:
    return {
        "id": m["_id"],
        "from_me": m["from_id"] == me,
        "text": m["text"],
        "created_at": _iso(m["created_at"]),
        "read": m.get("read_at") is not None,
    }


async def _block_state(me: str, other: str) -> dict:
    found = await blocks.find({
        "$or": [{"blocker_id": me, "blocked_id": other}, {"blocker_id": other, "blocked_id": me}],
    }).to_list(2)
    return {
        "blocked_by_me": any(b["blocker_id"] == me for b in found),
        "blocked_me": any(b["blocker_id"] == other for b in found),
    }


async def _get_other(user_id: str, me: str) -> dict:
    if user_id == me:
        raise HTTPException(status_code=400, detail="You can't message yourself.")
    other = await users.find_one({"_id": user_id}, {"name": 1, "role": 1})
    if not other:
        raise HTTPException(status_code=404, detail="That account no longer exists.")
    return other


def _contact_out(u: dict) -> dict:
    role = u.get("role", "student")
    return {
        "id": u["_id"],
        "name": u.get("preferred_name") or u.get("name") or "Unnamed account",
        "role": role,
        "role_label": ROLE_LABELS.get(role, role.title()),
    }


@router.get("/contacts")
async def list_contacts(user=Depends(get_current_user)):
    """Every other account, with the latest message and unread count for each.
    Conversations with activity come first (newest first), then everyone else
    alphabetically."""
    me = user["_id"]
    people = await users.find({"_id": {"$ne": me}}, {"name": 1, "preferred_name": 1, "role": 1}).to_list(5000)

    latest = {}
    async for row in direct_messages.aggregate([
        {"$match": {"$or": [{"from_id": me}, {"to_id": me}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$pair", "last": {"$first": "$$ROOT"}}},
    ]):
        m = row["last"]
        other = m["to_id"] if m["from_id"] == me else m["from_id"]
        latest[other] = m

    unread = {}
    async for row in direct_messages.aggregate([
        {"$match": {"to_id": me, "read_at": None}},
        {"$group": {"_id": "$from_id", "n": {"$sum": 1}}},
    ]):
        unread[row["_id"]] = row["n"]

    blocked_ids = {b["blocked_id"] async for b in blocks.find({"blocker_id": me}, {"blocked_id": 1})}

    out = []
    for p in people:
        c = _contact_out(p)
        m = latest.get(p["_id"])
        c["last_message"] = {"text": m["text"][:140], "from_me": m["from_id"] == me, "created_at": _iso(m["created_at"])} if m else None
        c["unread"] = unread.get(p["_id"], 0)
        c["blocked_by_me"] = p["_id"] in blocked_ids
        out.append(c)

    # ISO-8601 UTC strings sort chronologically, so: alphabetical, then newest activity first.
    out.sort(key=lambda c: c["name"].lower())
    out.sort(key=lambda c: c["last_message"]["created_at"] if c["last_message"] else "", reverse=True)
    return {"contacts": out}


@router.get("/unread")
async def unread_count(user=Depends(get_current_user)):
    return {"unread": await direct_messages.count_documents({"to_id": user["_id"], "read_at": None})}


@router.get("/thread/{user_id}")
async def get_thread(user_id: str, limit: int = Query(200, ge=1, le=500), user=Depends(get_current_user)):
    """The conversation with one account, oldest first. Marks their messages to me as read."""
    me = user["_id"]
    other = await _get_other(user_id, me)
    pair = _pair(me, user_id)
    msgs = await direct_messages.find({"pair": pair}).sort("created_at", -1).limit(limit).to_list(limit)
    msgs.reverse()
    await direct_messages.update_many({"pair": pair, "to_id": me, "read_at": None}, {"$set": {"read_at": _now()}})
    return {
        "contact": _contact_out(other),
        "messages": [_message_out(m, me) for m in msgs],
        **(await _block_state(me, user_id)),
    }


@router.post("/thread/{user_id}")
async def send_message(user_id: str, body: SendBody, user=Depends(get_current_user)):
    me = user["_id"]
    await _get_other(user_id, me)
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Message is empty.")
    state = await _block_state(me, user_id)
    if state["blocked_by_me"]:
        raise HTTPException(status_code=403, detail="You've blocked this account. Unblock them to send a message.")
    if state["blocked_me"]:
        raise HTTPException(status_code=403, detail="You can't message this account.")
    doc = {
        "_id": str(uuid.uuid4()),
        "pair": _pair(me, user_id),
        "from_id": me,
        "to_id": user_id,
        "text": text,
        "created_at": _now(),
        "read_at": None,
    }
    await direct_messages.insert_one(doc)
    return _message_out(doc, me)


@router.post("/block/{user_id}")
async def block(user_id: str, user=Depends(get_current_user)):
    me = user["_id"]
    await _get_other(user_id, me)
    await blocks.update_one(
        {"blocker_id": me, "blocked_id": user_id},
        {"$setOnInsert": {"_id": str(uuid.uuid4()), "created_at": _now()}},
        upsert=True,
    )
    return {"blocked_by_me": True}


@router.delete("/block/{user_id}")
async def unblock(user_id: str, user=Depends(get_current_user)):
    await blocks.delete_one({"blocker_id": user["_id"], "blocked_id": user_id})
    return {"blocked_by_me": False}


@router.post("/report/{user_id}")
async def report(user_id: str, body: ReportBody, user=Depends(get_current_user)):
    """Stores a report with the last 20 messages of the conversation as context,
    for staff to review in the database."""
    me = user["_id"]
    await _get_other(user_id, me)
    recent = await direct_messages.find({"pair": _pair(me, user_id)}).sort("created_at", -1).limit(20).to_list(20)
    await reports.insert_one({
        "_id": str(uuid.uuid4()),
        "reporter_id": me,
        "reported_id": user_id,
        "reason": body.reason.strip(),
        "message_ids": [m["_id"] for m in recent],
        "created_at": _now(),
        "status": "open",
    })
    logger.warning("Message report filed: reporter=%s reported=%s", me, user_id)
    return {"ok": True}
