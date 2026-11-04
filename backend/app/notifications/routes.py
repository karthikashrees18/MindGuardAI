import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.auth.utils import get_current_user
from app.config import (
    COUNSELOR_PHONE_NUMBER, NOTIFICATIONS_DRY_RUN,
    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER,
)
from app.database import contacts, engagement_events
from app.notifications.models import AlertRequest, AlertResponse, TrustedContact

logger = logging.getLogger("notifications")
router = APIRouter(prefix="/api", tags=["notifications"])


def send_sms(to_number: str, body: str) -> dict:
    if NOTIFICATIONS_DRY_RUN:
        logger.info("[DRY RUN] Would send SMS to %s: %s", to_number, body)
        return {"sid": "dry-run", "status": "logged"}

    from twilio.rest import Client  # imported lazily so the package is optional in dry-run mode

    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    msg = client.messages.create(to=to_number, from_=TWILIO_FROM_NUMBER, body=body)
    return {"sid": msg.sid, "status": msg.status}


async def _log_engagement(alert_type: str):
    """Feeds the admin dashboard's 'Counselor Resource Utilization' metric.
    Deliberately stores only a type + timestamp — no user_id, no name — so
    support-engagement volume can be counted without ever being traceable
    back to which student reached out."""
    await engagement_events.insert_one({
        "alert_type": alert_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


@router.post("/emergency/alert", response_model=AlertResponse)
async def emergency_alert(body: AlertRequest, user=Depends(get_current_user)):
    # Always act on the authenticated student, never on a client-supplied id.
    body.user_id = user["_id"]
    body.user_name = body.user_name or (user.get("profile") or {}).get("preferred_name") or user.get("name")
    await _log_engagement(body.alert_type)
    text = body.message or f"{body.user_name} has requested support through Mind Guard AI. Please reach out."

    if body.alert_type == "helpline":
        return AlertResponse(
            status="ok",
            dry_run=NOTIFICATIONS_DRY_RUN,
            detail="Helpline number surfaced to the student in-app (no outbound SMS for this action).",
        )

    if body.alert_type == "counselor":
        if not COUNSELOR_PHONE_NUMBER:
            return AlertResponse(status="skipped", dry_run=NOTIFICATIONS_DRY_RUN, detail="No COUNSELOR_PHONE_NUMBER configured.")
        result = send_sms(COUNSELOR_PHONE_NUMBER, text)
        return AlertResponse(status=result["status"], dry_run=NOTIFICATIONS_DRY_RUN, detail=f"Counselor alerted ({result['sid']}).")

    # trusted_contact
    docs = [c async for c in contacts.find({"user_id": body.user_id})]
    if not docs:
        return AlertResponse(status="skipped", dry_run=NOTIFICATIONS_DRY_RUN, detail="No trusted contacts on file for this user.")
    results = [send_sms(c["phone_number"], text) for c in docs]
    return AlertResponse(status="ok", dry_run=NOTIFICATIONS_DRY_RUN, detail=f"Alerted {len(results)} trusted contact(s).")


@router.post("/contacts", response_model=TrustedContact)
async def add_contact(body: TrustedContact, user=Depends(get_current_user)):
    body.user_id = user["_id"]
    await contacts.insert_one(body.model_dump())
    return body


@router.get("/contacts")
async def list_contacts(user_id: str = "", user=Depends(get_current_user)):
    if user_id and user_id != user["_id"]:
        raise HTTPException(status_code=403, detail="You can only view your own contacts.")
    docs = [c async for c in contacts.find({"user_id": user["_id"]})]
    for d in docs:
        d.pop("_id", None)
    return docs