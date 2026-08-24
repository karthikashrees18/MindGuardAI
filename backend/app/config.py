"""Central place for every environment-driven setting the backend uses."""
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "mindguard")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGO = "HS256"
JWT_EXPIRES_MINUTES = 60 * 24 * 7  # 1 week

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = "claude-sonnet-4-6"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")
COUNSELOR_PHONE_NUMBER = os.getenv("COUNSELOR_PHONE_NUMBER", "")
NOTIFICATIONS_DRY_RUN = not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER)

# --- Admin / Counselor analytics dashboard -----------------------------
# Minimum number of distinct students required in a subgroup (department,
# year, etc.) before it is shown on its own; smaller groups are folded
# into "Other / Insufficient Data" so no chart bucket can ever imply a
# single identifiable student. Standard k-anonymity practice.
K_ANONYMITY_THRESHOLD = int(os.getenv("K_ANONYMITY_THRESHOLD", "5"))

# A department/cohort's average distress index moving by at least this
# percentage between two equal-length windows triggers an early-warning
# banner on the admin dashboard.
ANOMALY_CHANGE_THRESHOLD_PERCENT = float(os.getenv("ANOMALY_CHANGE_THRESHOLD_PERCENT", "20"))