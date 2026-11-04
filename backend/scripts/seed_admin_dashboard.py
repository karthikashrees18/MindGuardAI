"""
Seeds mock data so the Admin & Counselor Analytics Dashboard can be
demoed immediately, without waiting on real signups/journal activity.

Usage (from backend/, with MONGO_URI pointed at your running Mongo):
    python -m scripts.seed_admin_dashboard

Creates:
  - 1 counselor login:  counselor@mindguard.ai / Counselor@123
  - 1 admin login:      admin@mindguard.ai     / Admin@123456
  - ~60 mock student accounts spread across 5 departments and 4 years
  - ~6 weeks of journal entries per student, with rumination scores that
    drift upward for the CSE / 4th-semester cohort in the most recent
    week (so the anomaly-detection banner has something to fire on) and
    journal text that hits a mix of the stress-factor keyword tags.

Safe to re-run: it skips creating an account if the email already exists,
but always adds a fresh batch of journal entries.
"""
import asyncio
import functools
import random
import uuid
from datetime import datetime, timedelta, timezone

from app.auth.utils import hash_password
from app.database import journals, users

DEPARTMENTS = ["CSE", "ISE", "ECE", "Mechanical", "Civil"]
YEARS = ["1st year", "2nd year", "3rd year", "4th year"]

STRESS_SNIPPETS = [
    "The assignment workload this week has been a lot, deadline after deadline.",
    "Couldn't sleep again, sleep deprived and it's affecting everything.",
    "Exam anxiety is creeping in, the mid sem is in two days and I feel behind.",
    "Feeling kind of lonely lately, no one to talk to on campus.",
    "Placement season interview prep is stressing me out more than I expected.",
    "Family pressure to perform well is a lot to carry alongside classes.",
    "Fees and tuition money worries have been on my mind all week.",
    "Had a genuinely good, calm day today, nothing major to report.",
    "Feeling grateful and relaxed after finishing my project early.",
    "A bit anxious about the upcoming viva but otherwise okay.",
]

CALM_SNIPPETS = [
    "Had a solid, relaxed day. Caught up with friends in the evening.",
    "Feeling proud of how the week went, on top of things.",
    "Nothing much today, just steady and okay.",
    "Good workout, good mood, nothing weighing on me right now.",
]


def rand_journal_text(elevated: bool) -> str:
    pool = STRESS_SNIPPETS if elevated else (STRESS_SNIPPETS[:6] + CALM_SNIPPETS)
    return random.choice(pool)


def score_for(elevated: bool) -> int:
    return random.randint(55, 92) if elevated else random.randint(5, 55)


def tier_of(score: int) -> str:
    if score < 26:
        return "Low"
    if score < 76:
        return "Moderate"
    return "High"


@functools.lru_cache(maxsize=8)
def _hash_once(password: str) -> str:
    # bcrypt is deliberately slow; mock students share one password, so hash it once.
    return hash_password(password)


async def ensure_account(email: str, name: str, password: str, role: str, profile: dict) -> str:
    existing = await users.find_one({"email": email})
    if existing:
        return existing["_id"]
    user_id = str(uuid.uuid4())
    await users.insert_one({
        "_id": user_id,
        "name": name,
        "email": email,
        "password_hash": _hash_once(password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "profile": profile,
        "preferences": {"checkin_time": "morning", "privacy_consent": True, "crisis_consent": True},
        "role": role,
    })
    return user_id


async def seed_students() -> list[dict]:
    students = []
    for i in range(60):
        dept = DEPARTMENTS[i % len(DEPARTMENTS)]
        year = YEARS[i % len(YEARS)]
        user_id = await ensure_account(
            email=f"student{i:03d}@mindguard.ai",
            name=f"Mock Student {i:03d}",
            password="Student@123",
            role="student",
            profile={"department": dept, "year_of_study": year, "institution": "State University"},
        )
        students.append({"_id": user_id, "department": dept, "year_of_study": year})
    return students


async def seed_journals(students: list[dict]):
    now = datetime.now(timezone.utc)
    # The anomaly-detection demo cohort: CSE, 4th year, elevated in the
    # most recent 48-hour window vs. everything before it.
    anomaly_group = {s["_id"] for s in students if s["department"] == "CSE" and s["year_of_study"] == "4th year"}

    for student in students:
        for days_ago in range(42, -1, -3):  # roughly twice a week for 6 weeks
            entry_date = now - timedelta(days=days_ago)
            recent_spike = student["_id"] in anomaly_group and days_ago <= 2
            elevated = recent_spike or (random.random() < 0.22)
            score = score_for(elevated)
            await journals.insert_one({
                "_id": str(uuid.uuid4()),
                "user_id": student["_id"],
                "text": rand_journal_text(elevated),
                "mood": "😔" if elevated else "🙂",
                "stress_level": score,
                "rumination_score": score,
                "risk_level": tier_of(score),
                "created_at": entry_date.isoformat(),
            })


async def main():
    counselor_id = await ensure_account(
        email="counselor@mindguard.ai", name="Dr. Priya Menon", password="Counselor@123",
        role="counselor", profile={"institution": "State University"},
    )
    admin_id = await ensure_account(
        email="admin@mindguard.ai", name="Wellness Admin", password="Admin@123456",
        role="admin", profile={"institution": "State University"},
    )
    students = await seed_students()
    await seed_journals(students)

    print(f"Counselor login: counselor@mindguard.ai / Counselor@123  (id={counselor_id})")
    print(f"Admin login:     admin@mindguard.ai / Admin@123456        (id={admin_id})")
    print(f"Seeded {len(students)} mock students with ~15 journal entries each.")
    print("Open the admin dashboard (frontend/admin.html) and sign in with either account.")


if __name__ == "__main__":
    asyncio.run(main())