"""Provision the counselor login from environment variables.

Set COUNSELOR_EMAIL and COUNSELOR_PASSWORD (e.g. in Render) and this runs at
every startup, in any mode (not just DEMO_MODE): it creates the counselor
account, or resets its password/role if it already exists. The password lives
only in the environment, never in the repo.

The counselor portal already covers every student account, so all accounts
created through sign-up appear in it. (Counselor logins are never created by sign-up.)
"""
import logging
import uuid
from datetime import datetime, timezone

from app.auth.utils import hash_password
from app.config import COUNSELOR_LOGIN_EMAIL, COUNSELOR_LOGIN_NAME, COUNSELOR_LOGIN_PASSWORD
from app.database import users

logger = logging.getLogger("auth.staff")


async def ensure_counselor_account() -> None:
    if not (COUNSELOR_LOGIN_EMAIL and COUNSELOR_LOGIN_PASSWORD):
        logger.info("COUNSELOR_EMAIL/COUNSELOR_PASSWORD not set - counselor account not provisioned")
        return
    existing = await users.find_one({"email": COUNSELOR_LOGIN_EMAIL})
    if existing:
        await users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"role": "counselor", "password_hash": hash_password(COUNSELOR_LOGIN_PASSWORD)}},
        )
        logger.info("Counselor account %s refreshed", COUNSELOR_LOGIN_EMAIL)
        return
    await users.insert_one({
        "_id": str(uuid.uuid4()),
        "email": COUNSELOR_LOGIN_EMAIL,
        "name": COUNSELOR_LOGIN_NAME,
        "password_hash": hash_password(COUNSELOR_LOGIN_PASSWORD),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "profile": {"institution": ""},
        "role": "counselor",
        "onboarding_complete": True,
    })
    logger.info("Counselor account %s created", COUNSELOR_LOGIN_EMAIL)
