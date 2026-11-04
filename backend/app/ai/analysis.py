"""
Glue between Engine 1 (text analysis: Claude when a key is configured,
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
from app.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_URL
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


async def call_claude_json(system_prompt: str, messages: list, max_tokens: int = 700) -> dict:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("no_api_key")
    async with httpx.AsyncClient(timeout=25) as client:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={"model": ANTHROPIC_MODEL, "max_tokens": max_tokens, "system": system_prompt, "messages": messages},
        )
        resp.raise_for_status()
        data = resp.json()
    block = next((b["text"] for b in data.get("content", []) if b.get("type") == "text"), "")
    cleaned = block.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)


async def engine1(text: str) -> dict:
    """Engine 1 — Claude if available, lexicon otherwise. Always returns the
    same shape as ai.scoring.analyze_text."""
    lex = analyze_text(text)
    if not ANTHROPIC_API_KEY:
        return lex
    try:
        c = await call_claude_json(SIGNAL_SYSTEM_PROMPT, [{"role": "user", "content": text}])
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
            "engine": "claude",
        }
    except (RuntimeError, httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError, TypeError) as exc:
        logger.warning("Claude analysis failed (%s) — using lexicon engine", exc)
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
) -> dict:
    """Full pipeline. Returns a flat dict ready to store + send to the client."""
    analysis = await engine1(text)
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
