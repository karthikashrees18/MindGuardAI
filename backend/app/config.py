"""Central place for every environment-driven setting the backend uses."""
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "mindguard")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGO = "HS256"
JWT_EXPIRES_MINUTES = 60 * 24 * 7  # 1 week

# --- LLM (Groq, OpenAI-compatible chat-completions API) ----------------------
# Read once at import time; never logged. Without a key the companion replies
# with an explicit "not configured" message and scoring uses the offline lexicon.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "llama-3.1-8b-instant")

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")
COUNSELOR_PHONE_NUMBER = os.getenv("COUNSELOR_PHONE_NUMBER", "")
NOTIFICATIONS_DRY_RUN = not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER)

# Comma-separated list of browser origins allowed to call the API, e.g.
# "https://mindguard.vercel.app,https://mindguard-admin.vercel.app".
# "*" (default, for local dev) allows any origin.
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

# --- Counselor login provisioned at startup (see app/auth/staff.py) -----------
# Demo defaults (shown on the sign-in screen). Override both in Render for a real deployment.
COUNSELOR_LOGIN_EMAIL = os.getenv("COUNSELOR_EMAIL", "counselor@mindguard.ai").strip()
COUNSELOR_LOGIN_PASSWORD = os.getenv("COUNSELOR_PASSWORD", "Counselor@123")
COUNSELOR_LOGIN_NAME = os.getenv("COUNSELOR_NAME", "Campus Counselor")

# --- Admin / Counselor analytics dashboard -----------------------------
K_ANONYMITY_THRESHOLD = int(os.getenv("K_ANONYMITY_THRESHOLD", "5"))

ANOMALY_CHANGE_THRESHOLD_PERCENT = float(os.getenv("ANOMALY_CHANGE_THRESHOLD_PERCENT", "20"))

# --- Presentation / demo mode ---------------------------------------------
# When on (default), the backend seeds counselor/admin logins, a cohort of
# mock students, and two demo personas on startup, and exposes
# /api/demo/* so the UI can switch persona with one click. Turn off in
# production: DEMO_MODE=0
DEMO_MODE = os.getenv("DEMO_MODE", "1").lower() not in ("0", "false", "no", "")

# --- Escalation thresholds (rumination score, 0-100) -------------------------
SCORE_CALM_MAX = 40       # 0-40   Normal / Calm
SCORE_MILD_MAX = 70       # 41-70  Mild Overthinking
                          # 71-100 Critical / High Distress
