import logging

from fastapi import APIRouter

from app.config import (
    COUNSELOR_PHONE_NUMBER, NOTIFICATIONS_DRY_RUN,
    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER,
)
from app.database import contacts
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


@router.post("/emergency/alert", response_model=AlertResponse)
async def emergency_alert(body: AlertRequest):
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
async def add_contact(body: TrustedContact):
    await contacts.insert_one(body.model_dump())
    return body


@router.get("/contacts")
async def list_contacts(user_id: str):
    docs = [c async for c in contacts.find({"user_id": user_id})]
    for d in docs:
        d.pop("_id", None)
    return docs
