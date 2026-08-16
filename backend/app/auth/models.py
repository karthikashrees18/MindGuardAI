from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field


class ProfileInfo(BaseModel):
    """Step 2 — demographics & academic profile. Everything optional so the
    account can still be created if a student skips ahead, but the frontend
    wizard collects all of it before submitting."""
    preferred_name: Optional[str] = None
    date_of_birth: Optional[str] = None  # ISO date string, e.g. "2004-08-16"
    gender_identity: Optional[str] = None  # "male" | "female" | "non_binary" | "prefer_not_to_say" | "custom"
    gender_custom: Optional[str] = None
    institution: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None


class EmergencyContactInfo(BaseModel):
    """A single Step 3 contact — either the trusted peer or the
    parent/guardian. Phone is the only strictly required field since that's
    what notifications/routes.py needs to actually send an SMS."""
    full_name: str
    relationship: Optional[str] = None
    phone_number: str
    email: Optional[EmailStr] = None


class WellnessPreferences(BaseModel):
    """Step 4 — quick baseline preferences & consent."""
    checkin_time: Optional[Literal["morning", "evening"]] = None
    privacy_consent: bool = False
    crisis_consent: bool = False


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)

    profile: Optional[ProfileInfo] = None
    peer_contact: Optional[EmergencyContactInfo] = None
    guardian_contact: Optional[EmergencyContactInfo] = None
    preferences: Optional[WellnessPreferences] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    preferred_name: Optional[str] = None
    institution: Optional[str] = None
    checkin_time: Optional[str] = None