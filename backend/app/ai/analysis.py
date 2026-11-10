"""
Glue between Engine 1 (text analysis: an LLM (Groq) when a key is configured,
lexicon otherwise) and Engine 2 (personalised rumination score).

`analyze_entry` is the single function every feature calls — check-ins,
the venting box, chat — so the score a student sees is computed one way
everywhere.
"""
import json
import logging
from typing import Optional, Sequence

import httpx

from app.ai.scoring import analyze_text
from app.config import GROQ_API_KEY, GROQ_BASE_URL, GROQ_FALLBACK_MODEL, GROQ_MODEL
from app.engine.rumination import compute_rumination

logger = logging.getLogger("ai.analysis")

SIGNAL_SYSTEM_PROMPT = """You are the language-analysis engine inside "Mind Guard AI", a student \
mental-wellness app. Read the student's text and report objective signals. Do not diagnose.

Respond with ONLY a single valid JSON object — no markdown fences, no commentary. Exactly these fields:
{
  "sentiment": number from -1.0 (very negative) to 1.0 (very positive),
  "stress_intensity": integer 0-100,
  "rumination_markers_score": integer 0-100 (repetitive negative framing, helplessness, catastrophising, self-blame, thought loops),
  "mood": "one or two word label, e.g. Calm, Anxious, Overwhelmed, Low, Hopeful, Content",
  "crisis": true only if the text mentions self-harm, suicide or not wanting to live, else false,
  "thought_loops": [short quotes of repetitive/looping phrases],
  "catastrophizing": [short quotes],
  "helplessness": [short quotes],
  "self_blame": [short quotes],
  "summary": "1-2 neutral sentences reflecting back what the student seems to be going through, addressed to them in second person"
}"""


class LLMError(RuntimeError):
    """Raised when the Groq call fails; `.reason` is a short, user-safe description."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def llm_configured() -> bool:
    return bool(GROQ_API_KEY)


async def call_llm(messages: list, *, max_tokens: int = 500, temperature: float = 0.7, json_mode: bool = False) -> str:
    """Chat completion against Groq's OpenAI-compatible endpoint.

    `messages` is the full [{role: system|user|assistant, content}] list, so the
    model always sees the whole conversation. Tries GROQ_MODEL, then
    GROQ_FALLBACK_MODEL. Every failure is logged with its specific cause and
    re-raised as LLMError — nothing is swallowed silently.
    """
    if not GROQ_API_KEY:
        raise LLMError("GROQ_API_KEY is not set")
    last = "unknown error"
    async with httpx.AsyncClient(timeout=30) as client:
        for model in dict.fromkeys([GROQ_MODEL, GROQ_FALLBACK_MODEL]):
            payload = {"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": temperature}
            if json_mode:
                payload["response_format"] = {"type": "json_object"}
            try:
                resp = await client.post(
                    f"{GROQ_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                    json=payload,
                )
                if resp.status_code >= 400:
                    # Groq returns {"error": {"message": ...}} — keep it for the server log.
                    try:
                        detail = resp.json().get("error", {}).get("message", resp.text[:200])
                    except ValueError:
                        detail = resp.text[:200]
                    last = f"HTTP {resp.status_code}: {detail}"
                    logger.error("Groq request failed (model=%s): %s", model, last)
                    if resp.status_code in (401, 403):
                        break  # a different model won't fix a bad key
                    continue
                content = resp.json()["choices"][0]["message"]["content"]
                if content and content.strip():
                    return content.strip()
                last = "empty completion"
                logger.error("Groq returned an empty completion (model=%s)", model)
            except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
                last = f"{type(exc).__name__}: {exc}"
                logger.error("Groq call error (model=%s): %s", model, last)
    raise LLMError(last)


async def call_llm_json(system_prompt: str, user_content: str, max_tokens: int = 700) -> dict:
    raw = await call_llm(
        [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
        max_tokens=max_tokens, temperature=0.2, json_mode=True,
    )
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Groq returned non-JSON analysis: %s", cleaned[:200])
        raise LLMError("invalid JSON from model") from exc


async def engine1(text: str, context: Optional[str] = None) -> dict:
    """Engine 1 — LLM if available, lexicon otherwise. Always returns the
    same shape as ai.scoring.analyze_text. `context` (earlier student turns in a
    chat) lets the live signal follow the whole conversation, not one message."""
    lex = analyze_text(text)
    if not GROQ_API_KEY:
        return lex
    prompt = text
    if context:
        prompt = ("Earlier in this conversation the student said:\n" + context
                  + "\n\nLatest message (analyse this, using the earlier turns for context):\n" + text)
    try:
        c = await call_llm_json(SIGNAL_SYSTEM_PROMPT, prompt)
        markers = dict(lex["markers"])
        for key in ("thought_loops", "catastrophizing", "helplessness", "self_blame"):
            if isinstance(c.get(key), list):
                markers[key] = [str(x)[:80] for x in c[key]][:5]
        # Keep the lexicon crisis check as a safety net: an LLM miss must never hide a crisis.
        return {
            **lex,
            "sentiment": max(-1.0, min(1.0, float(c.get("sentiment", lex["sentiment"])))),
            "stress_intensity": max(0.0, min(100.0, float(c.get("stress_intensity", lex["stress_intensity"])))),
            "rumination_markers_score": max(0.0, min(100.0, float(c.get("rumination_markers_score", lex["rumination_markers_score"])))),
            "mood": str(c.get("mood") or lex["mood"])[:24],
            "crisis": bool(c.get("crisis")) or lex["crisis"],
            "markers": markers,
            "summary": c.get("summary"),
            "engine": "groq",
        }
    except (LLMError, KeyError, ValueError, TypeError) as exc:
        logger.warning("LLM analysis failed (%s) — using lexicon engine", exc)
        return lex


def _template_summary(analysis: dict, result: dict) -> str:
    cat = result["category"]["key"]
    m = analysis["markers"]
    bits = []
    if m["thought_loops"]:
        bits.append("your thoughts seem to be circling")
    if m["helplessness"]:
        bits.append("things feel out of your control")
    if m["catastrophizing"]:
        bits.append("your mind is jumping to worst-case outcomes")
    if m["self_blame"]:
        bits.append("you're being hard on yourself")
    if result["triggers_hit"]:
        bits.append("this touches something that usually weighs on you")
    if cat == "calm":
        return "You sound steady and settled right now — nice. Noticing that is part of self-care."
    lead = "It sounds like " + (", and ".join(bits) if bits else "there is a lot on your mind") + "."
    tail = (" That's a lot to carry — a pause could help it loosen its grip." if cat == "mild"
            else " That's a heavy load, and you don't have to hold it alone.")
    return lead + tail


async def analyze_entry(
    text: str,
    stress_slider: Optional[float] = None,
    baseline: Optional[dict] = None,
    recent_scores: Sequence[float] = (),
    context: Optional[str] = None,
) -> dict:
    """Full pipeline. Returns a flat dict ready to store + send to the client."""
    analysis = await engine1(text, context)
    result = compute_rumination(analysis, stress_slider=stress_slider, baseline=baseline,
                                recent_scores=recent_scores, text=text)
    score = result["score"]
    return {
        "mood": analysis["mood"],
        "sentiment": analysis["sentiment"],
        "stress_intensity": round(analysis["stress_intensity"]),
        "rumination_score": score,
        "category": result["category"],
        "risk_level": result["risk_level"],
        "overthinking_percent": round(analysis["rumination_markers_score"]),
        "anxiety_risk": result["risk_level"],
        "markers": analysis["markers"],
        "factors": result["factors"],
        "triggers_detected": result["triggers_detected"],
        "triggers_hit": result["triggers_hit"],
        "crisis": bool(analysis.get("crisis")),
        "summary": analysis.get("summary") or _template_summary(analysis, result),
        "suggestion": result["suggestion"],
        "engine": analysis.get("engine", "lexicon"),
    }
