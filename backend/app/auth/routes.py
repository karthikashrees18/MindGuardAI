import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends

from app.database import users, contacts
from app.auth.models import SignupRequest, LoginRequest, TokenResponse, UserOut
from app.auth.utils import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(body: SignupRequest):
    existing = await users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = str(uuid.uuid4())
    profile = body.profile.model_dump() if body.profile else {}
    preferences = body.preferences.model_dump() if body.preferences else {}

    await users.insert_one({
        "_id": user_id,
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Step 2 — demographics & academic profile
        "profile": profile,
        # Step 4 — check-in preference + consent acknowledgements
        "preferences": preferences,
    })

    # Step 3 — support network. Stored in the shared `contacts` collection
    # (also used by notifications/routes.py's trusted_contact escalation)
    # so an "Alert trusted contact" SMS reaches whoever was entered here.
    if body.peer_contact:
        await contacts.insert_one({
            "user_id": user_id,
            "name": body.peer_contact.full_name,
            "phone_number": body.peer_contact.phone_number,
            "email": body.peer_contact.email,
            "relationship": body.peer_contact.relationship,
            "role": "peer",
        })
    if body.guardian_contact:
        await contacts.insert_one({
            "user_id": user_id,
            "name": body.guardian_contact.full_name,
            "phone_number": body.guardian_contact.phone_number,
            "email": body.guardian_contact.email,
            "relationship": body.guardian_contact.relationship,
            "role": "guardian",
        })

    return TokenResponse(access_token=create_token(user_id))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = await users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(access_token=create_token(user["_id"]))


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    profile = user.get("profile") or {}
    preferences = user.get("preferences") or {}
    return UserOut(
        id=user["_id"],
        name=user["name"],
        email=user["email"],
        preferred_name=profile.get("preferred_name"),
        institution=profile.get("institution"),
        checkin_time=preferences.get("checkin_time"),
    )