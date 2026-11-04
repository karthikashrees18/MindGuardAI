"""
Presentation seed data.

  ensure_demo_data()  idempotent; called on startup in DEMO_MODE
  reset_persona(key)  wipes + re-seeds one persona (the "reset demo" button)

Personas
  high  Aarav  — Student A: High Rumination. Escalating stress over the last
                 11 days, no early warning yet. Submit the sample entry live and
                 watch detection -> music -> warning -> counselor alert.
  calm  Meera  — Student B: Calm State. 11-day streak, blooming garden.

Counselor / admin logins come from scripts/seed_admin_dashboard.py; a few
cohort students are additionally flagged so the counselor portal is populated
the moment it opens.
"""
import asyncio
import logging
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.ai.scoring import analyze_text
from app.auth.utils import hash_password
from app.database import contacts, game_events, journals, users, warning_flags
from app.engine.rumination import compute_rumination
from app.escalation.service import alias_for

logger = logging.getLogger("demo.seed")

DEMO_PASSWORD = "Demo@12345"

PERSONAS = {
    "high": {
        "key": "high",
        "label": "Student A — High Rumination",
        "tagline": "Stress climbing for 11 days. Submit the sample entry to trigger detection → music → early warning.",
        "email": "aarav.demo@mindguard.ai",
        "name": "Aarav Menon",
        "preferred_name": "Aarav",
        "profile": {"department": "CSE", "year_of_study": "3rd year", "institution": "State University", "gender_identity": "male"},
        "baseline": {"triggers": ["exam_pressure", "deadlines", "low_marks"], "recovery": "multiple_days",
                     "coping": ["music", "breathing", "mini_games"]},
        "music": {"genres": ["lofi", "ambient"], "languages": ["english", "hindi"], "playlists": {}},
    },
    "calm": {
        "key": "calm",
        "label": "Student B — Calm State",
        "tagline": "Steady 11-day streak and a blooming garden. Check in live to see the garden grow.",
        "email": "meera.demo@mindguard.ai",
        "name": "Meera Iyer",
        "preferred_name": "Meera",
        "profile": {"department": "Psychology", "year_of_study": "2nd year", "institution": "State University", "gender_identity": "female"},
        "baseline": {"triggers": ["public_speaking"], "recovery": "lt_1h", "coping": ["journaling", "music"]},
        "music": {"genres": ["classical", "indie"], "languages": ["english", "tamil"], "playlists": {}},
    },
}

# days_ago -> entry text (oldest first)
HIGH_HISTORY = [
    (11, "Normal day, a bit tired after classes but okay.", 25),
    (10, "Feeling a bit stressed about the assignment deadline, hoping I can manage.", 40),
    (9, "Decent day. Caught up with friends after lab and felt okay.", 20),
    (8, "Anxious about the upcoming viva. Tired and a little behind on revision.", 48),
    (7, "Feeling a bit stressed about the assignment deadline, hoping I can manage.", 45),
    (6, "I'm really stressed about the exam. I keep thinking about how much syllabus is left and I'm so behind.", 62),
    (5, "Anxious about the upcoming viva. Tired and a little behind on revision.", 55),
    (4, "I'm really stressed about the exam. I keep thinking about how much syllabus is left and I'm so behind.", 65),
    (3, "Can't stop thinking about my low marks in the last test. What if I fail the semester? Feeling anxious and worried.", 70),
    (2, "Deadline tomorrow and I haven't started. I keep thinking I'll never finish, I always do this. I'm so overwhelmed and anxious.", 72),
    (1, "I keep replaying the viva over and over. I should have answered better. Everyone must think I'm not good enough. I feel so stressed and behind.", 78),
]

CALM_HISTORY = [
    (11, "Had a good day. Finished my reading early and went for a walk with friends. Feeling grateful.", 15),
    (10, "Slow morning, nice chai, studied for a bit. Feeling calm and a little proud of staying consistent.", 12),
    (9, "Presentation practice went better than I expected. I feel more confident and relaxed.", 25),
    (8, "Not much happened, but that's okay. Steady and content today.", 10),
    (7, "Enjoyed the lab session and laughed a lot with my team. Feeling happy.", 8),
    (6, "Slept well and had a productive study session. Feeling rested and motivated.", 10),
    (5, "A bit tired but overall okay. Evening walk helped me feel balanced.", 22),
    (4, "Journaled about my week. I'm proud of how I handled that disagreement. Feeling at peace.", 12),
    (3, "Good music, good food, good company. Grateful for today.", 8),
    (2, "A little nervous about the seminar next week but practicing helps. Feeling hopeful.", 28),
    (1, "Calm day. Finished my assignment ahead of the deadline and felt relieved.", 10),
]


def _build_entry(user_id: str, text: str, when: datetime, slider: int, baseline: dict, history: list[float]) -> dict:
    """Same two-engine maths as live check-ins (lexicon engine -> deterministic seeds)."""
    a = analyze_text(text)
    r = compute_rumination(a, stress_slider=slider, baseline=baseline, recent_scores=history, text=text)
    return {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "text": text,
        "mood": "🙂" if r["score"] <= 40 else "😔",
        "stress_level": slider,
        "rumination_score": r["score"],
        "risk_level": r["risk_level"],
        "created_at": when.isoformat(),
        "source": "checkin",
        "mood_label": a["mood"],
        "category": r["category"]["key"],
        "sentiment": a["sentiment"],
        "stress_intensity": round(a["stress_intensity"]),
        "triggers_detected": r["triggers_detected"],
    }


async def _upsert_persona(spec: dict) -> str:
    existing = await users.find_one({"email": spec["email"]})
    if existing:
        return existing["_id"]
    user_id = str(uuid.uuid4())
    await users.insert_one({
        "_id": user_id,
        "name": spec["name"],
        "email": spec["email"],
        "password_hash": hash_password(DEMO_PASSWORD),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "profile": {**spec["profile"], "preferred_name": spec["preferred_name"]},
        "preferences": {"checkin_time": "evening", "privacy_consent": True, "crisis_consent": True},
        "baseline": spec["baseline"],
        "music": spec["music"],
        "onboarding_complete": True,
        "is_demo": True,
        "role": "student",
    })
    await contacts.insert_many([
        {"user_id": user_id, "name": "Riya (roommate)", "phone_number": "+910000000001", "email": None,
         "relationship": "Roommate", "role": "peer"},
        {"user_id": user_id, "name": "Parent / guardian", "phone_number": "+910000000002", "email": None,
         "relationship": "Guardian", "role": "guardian"},
    ])
    return user_id


async def _seed_history(user_id: str, spec: dict, history: list[tuple[int, str, int]], games: list[tuple[int, int]]):
    now = datetime.now(timezone.utc)
    rng = random.Random(user_id)
    scores_so_far: list[float] = []
    docs = []
    for days_ago, text, slider in history:
        when = (now - timedelta(days=days_ago)).replace(hour=rng.choice([19, 20, 21, 22]), minute=rng.randint(0, 59), second=0, microsecond=0)
        entry = _build_entry(user_id, text, when, slider, spec["baseline"], list(reversed(scores_so_far))[:4])
        scores_so_far.append(entry["rumination_score"])
        docs.append(entry)
    if docs:
        await journals.insert_many(docs)
    if games:
        await game_events.insert_many([
            {"_id": str(uuid.uuid4()), "user_id": user_id, "game": "bubble_pop", "score": 20, "points": pts,
             "created_at": (now - timedelta(days=d)).isoformat()}
            for d, pts in games
        ])


async def reset_persona(key: str) -> str:
    spec = PERSONAS[key]
    user_id = await _upsert_persona(spec)
    await journals.delete_many({"user_id": user_id})
    await warning_flags.delete_many({"user_id": user_id})
    await game_events.delete_many({"user_id": user_id})
    # restore onboarding in case a demo edited it
    await users.update_one({"_id": user_id}, {"$set": {
        "baseline": spec["baseline"], "music": spec["music"], "onboarding_complete": True,
        "profile": {**spec["profile"], "preferred_name": spec["preferred_name"]},
    }})
    if key == "high":
        await _seed_history(user_id, spec, HIGH_HISTORY, games=[(4, 6), (2, 5)])
    else:
        await _seed_history(user_id, spec, CALM_HISTORY, games=[(9, 8), (6, 10), (3, 9), (1, 8)])
    return user_id


async def _seed_cohort_flags():
    """Give the counselor portal a realistic queue: 2 critical (one with a
    consented identity), 2 moderate, rest stable."""
    if await warning_flags.count_documents({"seeded": True}):
        return
    cursor = users.find({"email": {"$regex": r"^student\d+@mindguard\.ai$"}}).sort("email", 1).limit(8)
    students = [s async for s in cursor]
    if len(students) < 6:
        return
    now = datetime.now(timezone.utc)
    plan = [
        # (student idx, trail newest-first, severity, reason, connect)
        (0, [88, 81, 74], "critical", "Repeated high-distress entries.",
         {"channel": "email", "share_identity": True, "contact_detail": None, "note": "I haven't been sleeping and I'm falling behind. Please reach out."}),
        (1, [84, 79, 63], "critical", "Repeated high-distress entries.",
         {"channel": "in_app", "share_identity": False, "contact_detail": None, "note": None}),
        (2, [66, 61, 58], "moderate", "Rumination persisting across 3 entries (avg 62/100).", None),
        (3, [64, 60, 57], "moderate", "Rumination persisting across 3 entries (avg 60/100).", None),
    ]
    for idx, trail, severity, reason, connect in plan:
        u = students[idx]
        # the random cohort history would otherwise sit *after* this storyline and contradict the flag
        await journals.delete_many({"user_id": u["_id"]})
        entries = []
        for i, score in enumerate(reversed(trail)):          # oldest -> newest
            when = now - timedelta(days=len(trail) - 1 - i, hours=1)
            entries.append({
                "_id": str(uuid.uuid4()), "user_id": u["_id"], "text": "(seeded demo entry)", "mood": "😔",
                "stress_level": score, "rumination_score": score,
                "risk_level": "High" if score > 70 else "Moderate", "created_at": when.isoformat(),
                "source": "checkin", "category": "critical" if score > 70 else "mild",
                "triggers_detected": ["exam_pressure"] if i % 2 == 0 else ["deadlines"],
            })
        await journals.insert_many(entries)
        flag = {
            "_id": str(uuid.uuid4()), "user_id": u["_id"], "status": "active", "severity": severity,
            "reason": reason, "scores": trail, "created_at": (now - timedelta(hours=2 + idx)).isoformat(),
            "updated_at": now.isoformat(), "prompt_dismissed_until": None, "self_requested": False,
            "connect": ({**connect, "requested_at": (now - timedelta(hours=1 + idx)).isoformat()} if connect else None),
            "actions": [], "seeded": True,
        }
        if connect and connect["share_identity"]:
            flag["connect"]["contact_detail"] = u["email"]
        await warning_flags.insert_one(flag)
    logger.info("Seeded cohort early-warning flags (aliases: %s)", ", ".join(alias_for(s["_id"]) for s in students[:4]))


async def _seed_cohort():
    try:
        from scripts import seed_admin_dashboard as cohort
    except ImportError:
        logger.warning("scripts.seed_admin_dashboard not importable — skipping cohort seed")
        return
    if await users.count_documents({"email": {"$regex": r"^student\d+@mindguard\.ai$"}}) >= 20:
        return
    students = await cohort.seed_students()
    await cohort.seed_journals(students)


async def ensure_demo_data():
    """Idempotent. Safe to await at startup (staff + personas are fast); the
    heavier cohort seed runs as a background task so boot stays instant."""
    try:
        from scripts import seed_admin_dashboard as cohort
        await cohort.ensure_account("counselor@mindguard.ai", "Dr. Priya Menon", "Counselor@123", "counselor",
                                    {"institution": "State University"})
        await cohort.ensure_account("admin@mindguard.ai", "Wellness Admin", "Admin@123456", "admin",
                                    {"institution": "State University"})
    except ImportError:
        logger.warning("Could not provision counselor/admin accounts")

    for key, spec in PERSONAS.items():
        if not await users.find_one({"email": spec["email"]}):
            await reset_persona(key)

    async def _cohort_task():
        try:
            await _seed_cohort()
            await _seed_cohort_flags()
        except Exception:  # never take the server down over demo data
            logger.exception("cohort seed failed")

    asyncio.create_task(_cohort_task())
