"""One Mongo client shared by every module (auth, journal, notifications).
Import `db` and grab the collection you need — don't open new clients
elsewhere."""
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import MONGO_URI, MONGO_DB

client = AsyncIOMotorClient(MONGO_URI)
db = client[MONGO_DB]

users = db["users"]
journals = db["journals"]
contacts = db["contacts"]
# counselor_notes: private clinical notes per student, encrypted at rest (see app/counselor/routes.py)
counselor_notes = db["counselor_notes"]

# --- Admin / Counselor analytics dashboard -----------------------------
# broadcasts: anonymized, non-targeted wellness nudges counselors publish
#   to a cohort (e.g. "All 3rd Year Students"). Never references a
#   specific student.
# audit_logs: every admin/counselor read of aggregate analytics, kept for
#   institutional compliance (NAAC/VTU/UGC-style reporting).
# engagement_events: a bare timestamp + event type each time a student
#   taps the crisis helpline / counselor / trusted-contact actions.
#   Deliberately has no user_id — it exists only to be counted, so it
#   can't be used to re-identify anyone even by an admin with DB access.
broadcasts = db["broadcasts"]
audit_logs = db["audit_logs"]
engagement_events = db["engagement_events"]

# --- Wellness / escalation ---------------------------------------------------
# warning_flags: one open "early warning" per student (see app/escalation).
#   Holds the score trail that triggered it, the student's consented
#   connect request, and the counselor's follow-up actions.
# game_events: points earned from the mini-games (capped daily) which feed
#   the wellness garden.
warning_flags = db["warning_flags"]
game_events = db["game_events"]


async def ensure_indexes():
    """Idempotent; called on startup. Mirrors database/init/init-mongo.js so a
    local (non-docker) Mongo gets the same indexes."""
    await users.create_index("email", unique=True)
    await journals.create_index([("user_id", 1), ("created_at", -1)])
    await contacts.create_index("user_id")
    await warning_flags.create_index([("user_id", 1), ("status", 1)])
    await game_events.create_index([("user_id", 1), ("created_at", -1)])
