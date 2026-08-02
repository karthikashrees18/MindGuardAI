from typing import Literal, Optional
from pydantic import BaseModel


class AlertRequest(BaseModel):
    user_id: str
    user_name: Optional[str] = "A student"
    alert_type: Literal["helpline", "counselor", "trusted_contact"]
    message: Optional[str] = None


class AlertResponse(BaseModel):
    status: str
    dry_run: bool
    detail: str


class TrustedContact(BaseModel):
    user_id: str
    name: str
    phone_number: str
