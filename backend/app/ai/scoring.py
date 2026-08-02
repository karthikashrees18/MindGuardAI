"""
Lightweight keyword/heuristic scorer used when ANTHROPIC_API_KEY isn't
set, so the app is still demoable and testable offline. Swap this out
for a real NLP model (e.g. a fine-tuned BERT classifier) if your team
wants a non-LLM ML component for the project report.
"""
import re

RUMINATION_PHRASES = [
    "what if", "keep thinking", "can't stop thinking", "over and over",
    "again and again", "always", "never going to", "worst case",
    "everyone thinks", "i keep", "why did i", "should have",
]

NEGATIVE_WORDS = [
    "anxious", "anxiety", "overwhelmed", "stressed", "stress", "sad",
    "hopeless", "worthless", "tired", "exhausted", "scared", "afraid",
    "panic", "can't cope", "alone", "worried", "worry", "cry", "crying",
]

CRISIS_WORDS = [
    "kill myself", "suicide", "end it all", "no reason to live",
    "hurt myself", "self harm", "self-harm",
]

POSITIVE_WORDS = [
    "happy", "calm", "good", "great", "relaxed", "excited", "grateful",
    "proud", "hopeful", "better", "fine", "okay", "ok",
]


def keyword_score(text: str) -> dict:
    lower = text.lower()

    if any(phrase in lower for phrase in CRISIS_WORDS):
        return {
            "mood": "Distressed",
            "rumination_score": 95,
            "risk_level": "High",
            "suggestion": "This sounds really heavy to carry. Please reach out to a counselor, "
                           "a trusted person, or a crisis line right now — you don't have to "
                           "go through this alone.",
        }

    rumination_hits = sum(1 for p in RUMINATION_PHRASES if p in lower)
    negative_hits = sum(1 for w in NEGATIVE_WORDS if re.search(rf"\b{re.escape(w)}\b", lower))
    positive_hits = sum(1 for w in POSITIVE_WORDS if re.search(rf"\b{re.escape(w)}\b", lower))

    raw_score = rumination_hits * 18 + negative_hits * 12 - positive_hits * 10
    score = max(0, min(100, 25 + raw_score))

    if score >= 66:
        risk = "High"
        mood = "Overwhelmed"
        suggestion = "It sounds like a lot is circling right now. Consider talking to a counselor " \
                     "or a trusted person today, alongside a short breathing break."
    elif score >= 33:
        risk = "Moderate"
        mood = "Anxious" if negative_hits else "Unsettled"
        suggestion = "Try a 5-minute breathing break or a short walk before returning to this."
    else:
        risk = "Low"
        mood = "Calm" if positive_hits else "Neutral"
        suggestion = "Keep up whatever you're doing — it seems to be working."

    return {
        "mood": mood,
        "rumination_score": score,
        "risk_level": risk,
        "suggestion": suggestion,
    }
