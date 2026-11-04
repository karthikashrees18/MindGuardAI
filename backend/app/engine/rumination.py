"""
Engine 2 — the live Rumination / Stress score (0-100).

Takes Engine 1's raw signals (sentiment, stress intensity, rumination
markers) and personalises them:

  text signal   = 55% rumination markers + 30% stress intensity + 15% negativity
  + stress slider the student set on the check-in (25% blend when provided)
  x recovery factor from onboarding ("< 1 hour" students bounce back fast,
    "multiple days" students carry stress longer, so the same text weighs more)
  + trigger bonus   the entry touches one of the student's declared triggers
  + repetition bonus  several recent entries were already elevated

Categories (the product spec):
    0-40   Normal / Calm
   41-70   Mild Overthinking
   71-100  Critical / High Distress

Every adjustment is returned in `factors`, so the UI can show *why* the score
is what it is — an explainable score is far easier to defend in a viva than a
black box.
"""
import re
from typing import Optional, Sequence

from app.config import SCORE_CALM_MAX, SCORE_MILD_MAX

RECOVERY_FACTOR = {
    "lt_1h": 0.93,
    "few_hours": 1.0,
    "full_day": 1.08,
    "multiple_days": 1.16,
}
RECOVERY_LABEL = {
    "lt_1h": "< 1 hour",
    "few_hours": "A few hours",
    "full_day": "A full day",
    "multiple_days": "Multiple days",
}

TRIGGER_KEYWORDS = {
    "exam_pressure": ["exam", "exams", "test", "viva", "midterm", "mid sem", "mid-sem", "finals", "quiz", "revision"],
    "deadlines": ["deadline", "deadlines", "due", "submission", "submit", "assignment", "project"],
    "low_marks": ["marks", "grade", "grades", "failed", "backlog", "cgpa", "gpa", "result", "results", "scored"],
    "public_speaking": ["presentation", "present", "speech", "seminar", "speaking", "stage", "podium"],
    "social_conflict": ["friend", "friends", "argument", "argued", "fight", "fought", "roommate", "ignored", "left out", "breakup", "conflict"],
}
TRIGGER_LABEL = {
    "exam_pressure": "Exam pressure",
    "deadlines": "Deadlines",
    "low_marks": "Low marks",
    "public_speaking": "Public speaking",
    "social_conflict": "Social conflict",
}


def categorize(score: float) -> dict:
    s = round(score)
    if s <= SCORE_CALM_MAX:
        return {"key": "calm", "label": "Normal / Calm", "risk_level": "Low"}
    if s <= SCORE_MILD_MAX:
        return {"key": "mild", "label": "Mild Overthinking", "risk_level": "Moderate"}
    return {"key": "critical", "label": "Critical / High Distress", "risk_level": "High"}


def detect_triggers(text: str) -> list[str]:
    lower = (text or "").lower()
    tokens = set(re.findall(r"[a-z\-']+", lower))
    found = []
    for key, words in TRIGGER_KEYWORDS.items():
        for w in words:
            if (" " in w and w in lower) or w in tokens:
                found.append(key)
                break
    return found


def _suggestion(cat_key: str, crisis: bool) -> str:
    if crisis:
        return ("This sounds really heavy to carry. Please reach out to a counselor, a trusted "
                "person, or a crisis line right now — you don't have to go through this alone.")
    if cat_key == "critical":
        return ("A lot is circling right now. Take a slow breathing break, then consider a "
                "confidential chat with your campus counselor today.")
    if cat_key == "mild":
        return "Your mind is looping a bit. A short grounding break — music, breathing or a mini-game — can interrupt the spiral."
    return "You're in a steady place. Keep doing whatever is working — a quick check-in tomorrow keeps your garden growing."


def compute_rumination(
    analysis: dict,
    stress_slider: Optional[float] = None,
    baseline: Optional[dict] = None,
    recent_scores: Sequence[float] = (),
    text: str = "",
) -> dict:
    """Engine 2. `recent_scores` are the student's previous entries, newest first."""
    baseline = baseline or {}
    factors: list[dict] = []

    rum = float(analysis.get("rumination_markers_score", 0))
    stress = float(analysis.get("stress_intensity", 0))
    polarity = float(analysis.get("sentiment", 0))
    negativity = max(0.0, -polarity) * 100

    text_signal = 0.55 * rum + 0.30 * stress + 0.15 * negativity
    if polarity >= 0.3 and rum < 10:
        text_signal *= 0.6
        factors.append({"key": "positive_tone", "label": "Positive, settled tone", "delta": None})

    if stress_slider is not None:
        base = 0.75 * text_signal + 0.25 * float(stress_slider)
        factors.append({"key": "slider", "label": f"Your stress slider ({int(stress_slider)}/100)", "delta": None})
    else:
        base = text_signal
    score = base
    factors.insert(0, {"key": "text", "label": "Language analysis (rumination markers, stress, tone)", "delta": round(base)})

    # Recovery baseline from onboarding
    recovery = baseline.get("recovery") or "few_hours"
    rf = RECOVERY_FACTOR.get(recovery, 1.0)
    if rf != 1.0 and score > 20:
        before = score
        score *= rf
        factors.append({
            "key": "recovery",
            "label": f"Your usual recovery time is {RECOVERY_LABEL.get(recovery, recovery).lower()}",
            "delta": round(score - before),
        })

    # Declared triggers
    detected = detect_triggers(text)
    user_triggers = set(baseline.get("triggers") or [])
    hit = [t for t in detected if t in user_triggers]
    if hit and score > 20:
        bonus = min(10, 5 * len(hit))
        score += bonus
        factors.append({
            "key": "triggers",
            "label": "Touches your known triggers: " + ", ".join(TRIGGER_LABEL.get(t, t) for t in hit),
            "delta": bonus,
        })

    # Repeated negative entries
    recent = [s for s in list(recent_scores)[:4] if s is not None]
    elevated = sum(1 for s in recent if s > SCORE_CALM_MAX)
    if elevated and score > 30:
        bonus = min(12, 4 * elevated)
        score += bonus
        factors.append({
            "key": "repetition",
            "label": f"{elevated} of your last {len(recent)} entries were also elevated",
            "delta": bonus,
        })

    crisis = bool(analysis.get("crisis"))
    if crisis:
        score = max(score, 95)
        factors.append({"key": "crisis", "label": "Crisis language detected", "delta": None})

    score = int(round(max(0.0, min(100.0, score))))
    cat = categorize(score)
    return {
        "score": score,
        "category": cat,
        "risk_level": cat["risk_level"],
        "factors": factors,
        "triggers_detected": detected,
        "triggers_hit": hit,
        "suggestion": _suggestion(cat["key"], crisis),
    }
