import json
import logging
import random
from typing import Optional

import httpx
from fastapi import APIRouter, Depends

from app.ai.analysis import analyze_entry, call_claude_json
from app.ai.models import AnalysisResult, ChatRequest, JournalAnalyzeRequest
from app.auth.utils import get_optional_user
from app.config import ANTHROPIC_API_KEY
from app.journal.service import process_entry, recent_scores

logger = logging.getLogger("ai")
router = APIRouter(prefix="/api/ai", tags=["ai"])

CHAT_SYSTEM_PROMPT = """You are the AI companion inside "Mind Guard AI", a mental-wellness app \
for students. Chat naturally and warmly, like a caring, emotionally intelligent friend — never \
clinical, never scripted. Reflect what you hear, validate it, and gently ask one open follow-up \
question. If the student seems stuck in a loop of worry, help them step out of it (name the loop, \
shrink the problem to one next step). If they mention self-harm or not wanting to live, respond with \
care and encourage reaching a counselor, a trusted person or a crisis line right now.

Respond with ONLY a single valid JSON object — no markdown fences, no commentary. Exactly this field:
{ "reply": "your conversational reply, 1-4 sentences, warm and natural" }
Never say you are an AI language model or break character."""

_REPLIES = {
    "calm": [
        "That sounds like a steady kind of day — I like hearing that. What's one thing that helped it feel that way?",
        "Nice to hear you're in a good place. Anything you'd like to hold on to from today?",
    ],
    "mild": [
        "It sounds like your mind keeps circling that. That's exhausting. If you could shrink it to just one next step, what would it be?",
        "I hear a lot of weight in that. Let's slow it down together — what's the loudest worry right now?",
    ],
    "critical": [
        "That sounds really heavy, and I'm glad you said it out loud. You don't have to carry it alone — would you like to try a slow breathing minute with me, or talk to a counselor?",
        "Thank you for trusting me with this. What you're feeling is real. Let's take one breath at a time — and I can help you reach someone on campus whenever you want.",
    ],
}


def _fallback_reply(category_key: str, crisis: bool) -> str:
    if crisis:
        return ("I'm really glad you told me. What you're feeling matters, and you deserve support right now — "
                "please reach out to a counselor, someone you trust, or a crisis line. I can connect you with the campus counselor in one tap.")
    return random.choice(_REPLIES.get(category_key, _REPLIES["mild"]))


async def _claude_reply(body: ChatRequest) -> Optional[str]:
    if not ANTHROPIC_API_KEY:
        return None
    messages = [{"role": t.role, "content": t.content} for t in body.history]
    messages.append({"role": "user", "content": body.message})
    try:
        parsed = await call_claude_json(CHAT_SYSTEM_PROMPT, messages, max_tokens=500)
        reply = parsed.get("reply")
        return str(reply) if reply else None
    except (RuntimeError, httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError, TypeError) as exc:
        logger.warning("Claude chat failed (%s) — using fallback reply", exc)
        return None


def _to_result(a: dict, reply: Optional[str] = None, **extra) -> AnalysisResult:
    return AnalysisResult(
        reply=reply,
        mood=a["mood"],
        rumination_score=a["rumination_score"],
        risk_level=a["risk_level"],
        suggestion=a["suggestion"],
        overthinking_percent=a["overthinking_percent"],
        anxiety_risk=a["anxiety_risk"],
        summary=a["summary"],
        sentiment=a["sentiment"],
        stress_intensity=a["stress_intensity"],
        category=a["category"],
        markers=a["markers"],
        factors=a["factors"],
        crisis=a["crisis"],
        engine=a["engine"],
        **extra,
    )


@router.get("/health")
async def ai_health():
    return {"ai_backend": "claude" if ANTHROPIC_API_KEY else "keyword-fallback"}


@router.post("/chat", response_model=AnalysisResult)
async def chat(body: ChatRequest, user=Depends(get_optional_user)):
    """Companion chat. The conversational reply comes from Claude when a key is
    set; the score always comes from the same two-engine pipeline as check-ins.
    Signed-in students get personalised scoring and the message counts toward
    their trend, early-warning rules and garden."""
    reply = await _claude_reply(body)

    if user and user.get("role", "student") == "student":
        result = await process_entry(user, body.message, source="chat")
        a = result["analysis"]
        return _to_result(
            a,
            reply=reply or _fallback_reply(a["category"]["key"], a["crisis"]),
            early_warning=result["early_warning"]["show_prompt"],
            interventions=result["interventions"]["cards"],
        )

    a = await analyze_entry(body.message)
    return _to_result(a, reply=reply or _fallback_reply(a["category"]["key"], a["crisis"]))


@router.post("/analyze-journal", response_model=AnalysisResult)
async def analyze_journal(body: JournalAnalyzeRequest, user=Depends(get_optional_user)):
    """Stateless analysis (nothing is stored). Personalised when signed in."""
    baseline = (user or {}).get("baseline") or {}
    history = await recent_scores(user["_id"]) if user else []
    a = await analyze_entry(body.text, stress_slider=body.stress_level, baseline=baseline, recent_scores=history)
    return _to_result(a)
