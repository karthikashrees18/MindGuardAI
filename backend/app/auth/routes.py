import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends

from app.database import users, contacts
from app.auth.models import (
    BaselineProfile, LoginRequest, MusicPreferences, OnboardingUpdate, ProfileUpdate,
    SignupRequest, TokenResponse, UserOut,
)
from app.music.catalog import parse_spotify_playlist
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
        # Onboarding — baseline psychological profile + music taste
        "baseline": body.baseline.model_dump() if body.baseline else {},
        "music": body.music.model_dump() if body.music else {},
        "onboarding_complete": bool(body.baseline and body.baseline.recovery),
        # Every self-serve signup is a student. Counselor/admin accounts
        # are provisioned directly in the database (see
        # backend/scripts/seed_admin_dashboard.py) — there is no field on
        # SignupRequest that can set this to anything else.
        "role": "student",
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


async def user_out_full(user: dict) -> UserOut:
    """user_out plus the trusted-person contact (stored in `contacts`)."""
    out = user_out(user)
    peer = await contacts.find_one({"user_id": user["_id"], "role": "peer"})
    if peer:
        out.peer_contact = {
            "full_name": peer.get("name"), "relationship": peer.get("relationship"),
            "phone_number": peer.get("phone_number"), "email": peer.get("email"),
        }
    return out


def user_out(user: dict) -> UserOut:
    profile = user.get("profile") or {}
    preferences = user.get("preferences") or {}
    baseline = user.get("baseline") or {}
    music = user.get("music") or {}
    return UserOut(
        id=user["_id"],
        name=user["name"],
        email=user["email"],
        preferred_name=profile.get("preferred_name"),
        institution=profile.get("institution"),
        checkin_time=preferences.get("checkin_time"),
        role=user.get("role", "student"),
        baseline=BaselineProfile(**baseline) if baseline else None,
        music=MusicPreferences(**music) if music else None,
        onboarding_complete=bool(user.get("onboarding_complete")),
        is_demo=bool(user.get("is_demo")),
        department=profile.get("department"),
        year_of_study=profile.get("year_of_study"),
        privacy_consent=bool(preferences.get("privacy_consent")),
        crisis_consent=bool(preferences.get("crisis_consent")),
        custom_playlist=user.get("custom_playlist") or None,
        created_at=user.get("created_at"),
    )


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return await user_out_full(user)


@router.put("/onboarding", response_model=UserOut)
async def update_onboarding(body: OnboardingUpdate, user=Depends(get_current_user)):
    """Save / edit the baseline psychological profile and music preferences
    (used by the post-signup onboarding flow and the Profile page)."""
    updates: dict = {}
    if body.baseline is not None:
        updates["baseline"] = body.baseline.model_dump()
        updates["onboarding_complete"] = bool(body.baseline.recovery)
    if body.music is not None:
        updates["music"] = body.music.model_dump()
    if body.preferred_name is not None:
        updates["profile.preferred_name"] = body.preferred_name.strip() or None
    if body.checkin_time is not None:
        updates["preferences.checkin_time"] = body.checkin_time
    if updates:
        await users.update_one({"_id": user["_id"]}, {"$set": updates})
        user = await users.find_one({"_id": user["_id"]})
    return user_out(user)


@router.put("/profile", response_model=UserOut)
async def update_profile(body: ProfileUpdate, user=Depends(get_current_user)):
    """Edit the details collected at sign-up (and the custom Spotify playlist).
    Email and role cannot be changed here. Only the fields sent are updated."""
    sent = body.model_dump(exclude_unset=True)
    updates: dict = {}
    if "name" in sent and sent["name"] is not None:
        updates["name"] = sent["name"].strip()
    for key in ("preferred_name", "institution", "department", "year_of_study"):
        if key in sent and sent[key] is not None:
            updates[f"profile.{key}"] = sent[key].strip() or None
    if "profile.institution" in updates and not updates["profile.institution"]:
        raise HTTPException(status_code=422, detail="Institution can't be empty.")
    if sent.get("checkin_time") is not None:
        updates["preferences.checkin_time"] = sent["checkin_time"] or None
    for key in ("privacy_consent", "crisis_consent"):
        if sent.get(key) is not None:
            updates[f"preferences.{key}"] = bool(sent[key])
    if "custom_playlist" in sent and sent["custom_playlist"] is not None:
        raw = sent["custom_playlist"].strip()
        if raw:
            pid = parse_spotify_playlist(raw)
            if not pid:
                raise HTTPException(status_code=422, detail="That doesn't look like a Spotify playlist link.")
            updates["custom_playlist"] = pid
        else:
            updates["custom_playlist"] = None

    peer = sent.get("peer_contact")
    if peer is not None:
        name = (peer.get("full_name") or "").strip()
        phone = (peer.get("phone_number") or "").strip()
        if not name and not phone:
            await contacts.delete_many({"user_id": user["_id"], "role": "peer"})
        else:
            if not (name and phone):
                raise HTTPException(status_code=422, detail="A trusted person needs both a name and a phone number.")
            await contacts.update_one(
                {"user_id": user["_id"], "role": "peer"},
                {"$set": {
                    "name": name, "phone_number": phone,
                    "relationship": (peer.get("relationship") or "").strip() or None,
                    "email": (peer.get("email") or "").strip() or None,
                }},
                upsert=True,
            )

    if updates:
        await users.update_one({"_id": user["_id"]}, {"$set": updates})
        user = await users.find_one({"_id": user["_id"]})
    return await user_out_full(user)
