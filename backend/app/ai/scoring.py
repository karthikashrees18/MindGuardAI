"""
Engine 1 — text analysis.

A transparent, offline NLP layer that reads a piece of free text (journal
entry, vent box, chat message) and returns three independent signals plus
the evidence behind them:

  * sentiment polarity   -1.0 (very negative) .. +1.0 (very positive)
  * stress intensity     0 .. 100
  * rumination markers   repetitive negative framing, helplessness,
                         catastrophising, self-blame, absolutist language,
                         thought-loop phrases, lexical repetition

When GROQ_API_KEY is set, app/ai/analysis.py asks the Groq LLM for the same
three signals instead; either way the numbers are handed to Engine 2
(app/engine/rumination.py) which personalises them into the 0-100
Rumination / Stress score. This module is also the fallback so the app is
fully demoable with no network and no key.

Swap this for a fine-tuned classifier (e.g. DistilBERT on GoEmotions) if the
team wants a trained-model component for the report — the return shape is
the contract.
"""
import re
from collections import Counter

# ---------------------------------------------------------------------------
# Lexicons
# ---------------------------------------------------------------------------

LOOP_PHRASES = [
    "over and over", "again and again", "keep thinking", "keep replaying",
    "can't stop thinking", "cant stop thinking", "can't stop", "cant stop",
    "on repeat", "going in circles", "stuck in my head", "can't let go",
    "cant let go", "overthinking", "overthink", "spiraling", "spiralling",
    "replaying", "ruminating", "i keep", "keeps coming back", "can't get it out",
    "won't stop", "wont stop", "all i think about", "cant sleep because",
    "can't sleep because", "lying awake", "up all night thinking",
]
CATASTROPHE_PHRASES = [
    "what if", "worst case", "worst-case", "going to fail", "gonna fail",
    "ruin everything", "ruined", "disaster", "doomed", "no way i'll",
    "end of the world", "everything will fall", "i'll never", "i will never",
    "it's over", "its over", "can't recover", "cant recover",
]
HELPLESS_PHRASES = [
    "hopeless", "helpless", "pointless", "no way out", "nothing works",
    "nothing ever", "no use", "what's the point", "whats the point",
    "give up", "giving up", "trapped", "stuck", "can't do anything",
    "cant do anything", "can't cope", "cant cope", "can't handle", "cant handle",
    "no point", "nothing helps", "never going to", "never gonna", "no hope",
    "worthless", "useless", "can't take it", "cant take it", "too much for me",
]
SELF_BLAME_PHRASES = [
    "my fault", "i'm a failure", "im a failure", "i am a failure",
    "i messed up", "i screwed up", "why did i", "why am i", "i'm stupid",
    "im stupid", "i hate myself", "i should have", "i shouldn't have",
    "i'm not good enough", "im not good enough", "not smart enough",
    "i always mess", "i ruin", "disappoint",
]
ABSOLUTES = {
    "always", "never", "nothing", "everything", "everyone", "nobody",
    "no one", "completely", "totally", "entirely", "forever", "every time",
}
CRISIS_PHRASES = [
    "kill myself", "suicide", "suicidal", "end it all", "no reason to live",
    "hurt myself", "self harm", "self-harm", "don't want to be here",
    "dont want to be here", "want to disappear", "better off without me",
    "end my life",
]

NEGATIVE_WORDS = {
    # strong (weight 2)
    "hopeless": 2, "worthless": 2, "terrified": 2, "miserable": 2, "devastated": 2,
    "panic": 2, "panicking": 2, "hate": 2, "awful": 2, "horrible": 2, "depressed": 2,
    "crying": 2, "numb": 2, "broken": 2, "exhausted": 2, "helpless": 2, "dread": 2,
    # regular (weight 1)
    "anxious": 1, "anxiety": 1, "overwhelmed": 1, "stressed": 1, "stress": 1,
    "sad": 1, "tired": 1, "scared": 1, "afraid": 1, "alone": 1, "lonely": 1,
    "worried": 1, "worry": 1, "cry": 1, "bad": 1, "worse": 1, "worst": 1,
    "fail": 1, "failed": 1, "failing": 1, "failure": 1, "angry": 1, "upset": 1,
    "frustrated": 1, "nervous": 1, "tense": 1, "burnout": 1, "burned": 1,
    "behind": 1, "guilty": 1, "ashamed": 1, "ignored": 1, "stuck": 1, "drained": 1,
    "pressure": 1, "difficult": 1, "hard": 1, "lost": 1, "confused": 1, "sick": 1,
    "mess": 1, "terrible": 1, "unhappy": 1, "empty": 1, "dread": 1,
}
POSITIVE_WORDS = {
    "happy": 2, "great": 2, "grateful": 2, "proud": 2, "excited": 2, "wonderful": 2,
    "amazing": 2, "joy": 2, "love": 2, "calm": 1, "good": 1, "relaxed": 1,
    "hopeful": 1, "better": 1, "fine": 1, "okay": 1, "peaceful": 1, "content": 1,
    "thankful": 1, "fun": 1, "enjoyed": 1, "enjoy": 1, "smile": 1, "laughed": 1,
    "productive": 1, "confident": 1, "motivated": 1, "rested": 1, "relief": 1,
    "relieved": 1, "balanced": 1, "steady": 1, "positive": 1, "glad": 1, "nice": 1,
    "walk": 1, "finished": 1, "accomplished": 1,
}
STRESS_WORDS = {
    "deadline": 1.2, "deadlines": 1.2, "exam": 1.3, "exams": 1.3, "viva": 1.2,
    "pressure": 1.2, "overwhelmed": 1.6, "stressed": 1.5, "stress": 1.3,
    "anxious": 1.4, "anxiety": 1.4, "panic": 1.8, "panicking": 1.8, "burnout": 1.6,
    "exhausted": 1.4, "behind": 1.0, "failing": 1.5, "failed": 1.3, "fail": 1.3,
    "nervous": 1.1, "tense": 1.1, "worried": 1.2, "worry": 1.1, "scared": 1.3,
    "afraid": 1.2, "sleepless": 1.4, "insomnia": 1.4, "overload": 1.4,
    "assignment": 0.8, "assignments": 0.8, "presentation": 0.9, "marks": 0.7,
    "backlog": 1.1, "interview": 0.8, "placement": 0.8, "rushing": 1.0,
    "too much": 1.3, "can't breathe": 1.8, "cant breathe": 1.8, "racing": 1.2,
    "dread": 1.4, "terrified": 1.8, "crying": 1.3,
}
INTENSIFIERS = {
    "so", "very", "extremely", "really", "totally", "completely", "absolutely",
    "constantly", "terribly", "incredibly", "super", "insanely", "way",
}
NEGATIONS = {
    "not", "no", "never", "don't", "dont", "can't", "cant", "isn't", "isnt",
    "wasn't", "wasnt", "won't", "wont", "ain't", "hardly", "without", "didn't", "didnt",
}
STOPWORDS = set("""
a about after again all also am an and any are as at be because been before being
but by can could did do does doing for from had has have having he her here him
his how i if in into is it its just me more most my of on one only or other our
out over own she so some such than that the their them then there these they this
those through to too under until up us very was we were what when where which
while who why will with would you your im ive dont cant thats its
""".split())


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z']+", text.lower().replace("’", "'"))


def _phrase_hits(lower: str, phrases: list[str]) -> list[str]:
    seen, hits = set(), []
    for p in phrases:
        if p in lower and p not in seen:
            # don't double count a shorter phrase contained in an earlier hit
            if any(p in h for h in hits):
                continue
            seen.add(p)
            hits.append(p)
    return hits


def _lexical_repetition(tokens: list[str]) -> tuple[float, list[str]]:
    """Share of content words that are repeats of an earlier content word,
    plus repeated bigrams — circling back to the same words is the textbook
    surface signature of rumination."""
    content = [t for t in tokens if len(t) > 3 and t not in STOPWORDS]
    if len(content) < 6:
        return 0.0, []
    counts = Counter(content)
    repeats = sum(c - 1 for c in counts.values() if c > 1)
    ratio = repeats / len(content)
    bigrams = Counter(zip(content, content[1:]))
    repeated_bigrams = [" ".join(b) for b, c in bigrams.items() if c > 1]
    top = [w for w, c in counts.most_common(3) if c > 1]
    return min(1.0, ratio * 2.2 + 0.15 * len(repeated_bigrams)), top


def analyze_text(text: str) -> dict:
    """Engine 1. Pure function: text in, signals + evidence out."""
    raw = text or ""
    lower = raw.lower().replace("’", "'")
    tokens = _tokens(lower)
    n_tokens = max(1, len(tokens))

    crisis = _phrase_hits(lower, CRISIS_PHRASES)

    # --- sentiment polarity (negation-aware) ---------------------------------
    pos = neg = 0.0
    neg_words_found: list[str] = []
    pos_words_found: list[str] = []
    for i, tok in enumerate(tokens):
        negated = any(t in NEGATIONS for t in tokens[max(0, i - 2):i])
        if tok in NEGATIVE_WORDS:
            w = NEGATIVE_WORDS[tok]
            if negated:
                pos += 0.5 * w
            else:
                neg += w
                neg_words_found.append(tok)
        elif tok in POSITIVE_WORDS:
            w = POSITIVE_WORDS[tok]
            if negated:
                neg += 0.8 * w
                neg_words_found.append(f"not {tok}")
            else:
                pos += w
                pos_words_found.append(tok)
    polarity = (pos - neg) / (pos + neg + 1.5)
    polarity = max(-1.0, min(1.0, polarity))

    # --- stress intensity -----------------------------------------------------
    stress_raw = 0.0
    stress_found: list[str] = []
    for key, w in STRESS_WORDS.items():
        if " " in key:
            if key in lower:
                stress_raw += w
                stress_found.append(key)
        else:
            c = tokens.count(key)
            if c:
                stress_raw += w * min(c, 3)
                stress_found.append(key)
    boosters = sum(1 for t in tokens if t in INTENSIFIERS)
    exclaim = raw.count("!")
    letters = [c for c in raw if c.isalpha()]
    caps_ratio = (sum(1 for c in letters if c.isupper()) / len(letters)) if len(letters) > 12 else 0
    stress_intensity = stress_raw * 12 + boosters * 3 + min(exclaim, 5) * 2.5 + caps_ratio * 25
    stress_intensity += max(0.0, -polarity) * 18
    stress_intensity = max(0.0, min(100.0, stress_intensity))

    # --- rumination markers ------------------------------------------------------
    loops = _phrase_hits(lower, LOOP_PHRASES)
    catastrophes = _phrase_hits(lower, CATASTROPHE_PHRASES)
    helpless = _phrase_hits(lower, HELPLESS_PHRASES)
    self_blame = _phrase_hits(lower, SELF_BLAME_PHRASES)
    absolutes = [a for a in ABSOLUTES if (a in tokens if " " not in a else a in lower)]
    repetition, repeated_words = _lexical_repetition(tokens)

    sentences = [s for s in re.split(r"[.!?\n]+", raw) if s.strip()]
    neg_sentences = 0
    for s in sentences:
        sl = s.lower()
        st = _tokens(sl)
        if any(t in NEGATIVE_WORDS for t in st) or any(p in sl for p in HELPLESS_PHRASES + SELF_BLAME_PHRASES):
            neg_sentences += 1
    negative_framing = (neg_sentences / len(sentences)) if len(sentences) >= 2 else (1.0 if neg and polarity < -0.2 else 0.0)

    rumination_raw = (
        18 * len(loops)
        + 12 * len(catastrophes)
        + 13 * len(helpless)
        + 11 * len(self_blame)
        + 4 * min(len(absolutes), 3)
        + 30 * repetition
        + 14 * negative_framing * (1 if neg > 0 else 0)
    )
    rumination_markers_score = max(0.0, min(100.0, rumination_raw))

    # --- mood label -------------------------------------------------------------
    if crisis:
        mood = "Distressed"
    elif rumination_markers_score >= 60:
        mood = "Overwhelmed" if stress_intensity >= 50 else "Ruminating"
    elif rumination_markers_score >= 35 or stress_intensity >= 55:
        mood = "Anxious"
    elif polarity <= -0.35:
        mood = "Low"
    elif polarity >= 0.4:
        mood = "Hopeful" if any(w in pos_words_found for w in ("hopeful", "better", "motivated")) else "Content"
    elif polarity >= 0.1:
        mood = "Calm"
    else:
        mood = "Neutral"

    return {
        "crisis": bool(crisis),
        "sentiment": round(polarity, 3),
        "stress_intensity": round(stress_intensity, 1),
        "rumination_markers_score": round(rumination_markers_score, 1),
        "mood": mood,
        "markers": {
            "thought_loops": loops,
            "catastrophizing": catastrophes,
            "helplessness": helpless,
            "self_blame": self_blame,
            "absolutist_language": absolutes,
            "repeated_words": repeated_words,
            "negative_framing_pct": round(negative_framing * 100),
            "negative_words": sorted(set(neg_words_found))[:8],
            "positive_words": sorted(set(pos_words_found))[:8],
            "stress_words": sorted(set(stress_found))[:8],
        },
        "word_count": len(tokens),
        "engine": "lexicon",
    }


# ---------------------------------------------------------------------------
# Backwards-compatible helper (older callers: ai/routes.py fallbacks)
# ---------------------------------------------------------------------------

def keyword_score(text: str) -> dict:
    """Original one-shot API, now powered by the full two-engine pipeline
    with no personalisation (no baseline, no history)."""
    from app.engine.rumination import compute_rumination  # local import avoids a cycle

    analysis = analyze_text(text)
    result = compute_rumination(analysis)
    return {
        "mood": analysis["mood"],
        "rumination_score": result["score"],
        "risk_level": result["risk_level"],
        "suggestion": result["suggestion"],
    }
