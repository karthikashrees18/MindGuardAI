"""
Smart intervention engine.

Given where a student's score landed and what they told us in onboarding
(coping preferences, music taste, triggers), build the ordered list of
intervention cards the UI renders. Pure function — no I/O — so it is trivial
to unit-test and explain.

Card `type`s the frontend knows how to render:
  music | breathing | pomodoro | game_bubble | game_reframe | journal_prompt | counselor
"""
from typing import Optional

from app.music.catalog import TRANSITIONS, recommend_tracks

COPING_TO_TYPES = {
    "music": ["music"],
    "breathing": ["breathing"],
    "mini_games": ["game_bubble", "game_reframe"],
    "journaling": ["journal_prompt"],
}

REFRAME_PROMPTS = {
    "exam_pressure": "What would you tell a friend who felt this way about their exam?",
    "deadlines": "Which one small piece of the deadline can you finish in the next 20 minutes?",
    "low_marks": "One mark is a data point about one exam — not a verdict on you. What did it teach you?",
    "public_speaking": "Name one thing you know really well about your topic. Start there.",
    "social_conflict": "What is one thing you can control about this situation today?",
}
DEFAULT_PROMPT = "Write down the loudest worry, then one thing you know is true and one thing you can do next."


def _target_state(category_key: str, triggers_hit: list[str], mood: str) -> str:
    if category_key == "critical":
        return "calming"
    if category_key == "mild":
        return "focus" if any(t in ("exam_pressure", "deadlines") for t in triggers_hit) else "grounded"
    if (mood or "").lower() in ("low", "sad", "flat", "tired"):
        return "uplifting"
    return "focus" if triggers_hit else "uplifting"


def build_interventions(
    category_key: str,
    mood: str = "",
    triggers_hit: Optional[list[str]] = None,
    baseline: Optional[dict] = None,
    music_prefs: Optional[dict] = None,
    early_warning: bool = False,
) -> dict:
    triggers_hit = triggers_hit or []
    baseline = baseline or {}
    music_prefs = music_prefs or {}
    coping = baseline.get("coping") or []

    state = _target_state(category_key, triggers_hit, mood)
    transition = TRANSITIONS[state]
    tracks = recommend_tracks(
        state,
        genres=music_prefs.get("genres"),
        languages=music_prefs.get("languages"),
        custom_playlists=music_prefs.get("playlists"),
    )

    cards: list[dict] = []
    elevated = category_key in ("mild", "critical")

    cards.append({
        "id": "music", "type": "music", "priority": 1,
        "title": transition["label"],
        "subtitle": "A short listening session chosen for the state you're in",
        "payload": {"target_state": state, "transition": transition, "tracks": tracks},
    })

    if elevated:
        cards.append({
            "id": "breathing", "type": "breathing", "priority": 2,
            "title": "4-7-8 breathing",
            "subtitle": "Inhale 4 · hold 7 · exhale 8 — a few rounds slow a racing mind",
            "payload": {"inhale": 4, "hold": 7, "exhale": 8, "rounds": 4},
        })
        cards.append({
            "id": "pomodoro", "type": "pomodoro", "priority": 3,
            "title": "5-minute reset break",
            "subtitle": "Step away from the screen, water, stretch — then come back",
            "payload": {"minutes": 5},
        })
        cards.append({
            "id": "game_bubble", "type": "game_bubble", "priority": 4,
            "title": "Zen Bubble Pop",
            "subtitle": "Pop anxious thoughts into calm affirmations",
            "payload": {},
        })
        cards.append({
            "id": "game_reframe", "type": "game_reframe", "priority": 5,
            "title": "Thought Reframe",
            "subtitle": "One minute: match each distortion to a realistic reframe",
            "payload": {},
        })
        prompt = REFRAME_PROMPTS.get(triggers_hit[0], DEFAULT_PROMPT) if triggers_hit else DEFAULT_PROMPT
        cards.append({
            "id": "journal_prompt", "type": "journal_prompt", "priority": 6,
            "title": "Reframe it on paper",
            "subtitle": prompt, "payload": {"prompt": prompt},
        })
    else:
        cards.append({
            "id": "game_bubble", "type": "game_bubble", "priority": 3,
            "title": "Zen Bubble Pop",
            "subtitle": "A calm two-minute break that also waters your garden",
            "payload": {},
        })

    if category_key == "critical" or early_warning:
        cards.append({
            "id": "counselor", "type": "counselor", "priority": 0,
            "title": "Talk to a campus counselor",
            "subtitle": "Confidential. One tap sends a connect request — you choose what's shared.",
            "payload": {},
        })

    # Respect the student's own coping preferences: preferred types first.
    preferred = [t for c in coping for t in COPING_TO_TYPES.get(c, [])]

    def sort_key(card: dict):
        if card["type"] == "counselor":
            return (0, 0)
        if card["type"] in preferred:
            return (1, preferred.index(card["type"]))
        return (2, card["priority"])

    cards.sort(key=sort_key)
    return {"target_state": state, "transition": transition, "cards": cards}
