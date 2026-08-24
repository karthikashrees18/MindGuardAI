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