import json

import httpx
from fastapi import APIRouter

from app.config import ANTHROPIC_API_KEY, ANTHROPIC_URL, ANTHROPIC_MODEL
from app.ai.models import ChatRequest, AnalysisResult, JournalAnalyzeRequest
from app.ai.scoring import keyword_score

router = APIRouter(prefix="/api/ai", tags=["ai"])

CHAT_SYSTEM_PROMPT = """You are the AI companion inside "Mind Guard AI", a mental-wellness app \
for students. Chat naturally and warmly, like a caring, emotionally intelligent friend — never \
clinical, never scripted. You also continuously read the emotional undertone of the conversation.

Respond with ONLY a single valid JSON object — no markdown fences, no commentary. Exactly these fields:
{
  "reply": "your conversational reply, 1-4 sentences, warm and natural, may include a gentle follow-up question",
  "mood": "one or two word label, e.g. Calm, Anxious, Overwhelmed, Sad, Hopeful, Frustrated, Content",
  "rumination_score": integer 0-100 estimating repetitive overthinking/worry-spiraling in this message and the conversation so far,
  "risk_level": "Low" | "Moderate" | "High",
  "suggestion": "one short, concrete, supportive next step; if risk_level is High, gently encourage reaching out to a counselor, trusted person, or crisis line"
}
Never say you are an AI language model or break character. Never include text outside the JSON object."""

JOURNAL_SYSTEM_PROMPT = """You are the AI analysis engine inside "Mind Guard AI". Analyze a \
student's journal entry for sentiment, overthinking, and anxiety risk.

Respond with ONLY a single valid JSON object — no markdown fences, no commentary. Exactly these fields:
{
  "mood": "one or two word label for the dominant mood in the entry",
  "rumination_score": integer 0-100,
  "overthinking_percent": integer 0-100 (how much of the entry reflects repetitive/spiraling thought patterns),
  "anxiety_risk": "Low" | "Moderate" | "High",
  "risk_level": "Low" | "Moderate" | "High" (overall wellbeing risk),
  "summary": "1-2 sentence neutral summary of what's going on, for the student to read about themselves",
  "suggestion": "one short, concrete, supportive next step; if risk_level is High, gently encourage professional/counselor support"
}
Never include text outside the JSON object."""


async def call_claude(system_prompt: str, messages: list) -> dict:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("no_api_key")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": 1000,
                "system": system_prompt,
                "messages": messages,
            },
        )
        resp.raise_for_status()
        data = resp.json()
    text_block = next((b["text"] for b in data.get("content", []) if b.get("type") == "text"), "")
    cleaned = text_block.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)


@router.get("/health")
async def ai_health():
    return {"ai_backend": "claude" if ANTHROPIC_API_KEY else "keyword-fallback"}


@router.post("/chat", response_model=AnalysisResult)
async def chat(body: ChatRequest):
    messages = [{"role": t.role, "content": t.content} for t in body.history]
    messages.append({"role": "user", "content": body.message})

    try:
        parsed = await call_claude(CHAT_SYSTEM_PROMPT, messages)
        return AnalysisResult(
            reply=parsed.get("reply", "I'm here with you."),
            mood=parsed.get("mood", "Neutral"),
            rumination_score=int(parsed.get("rumination_score", 30)),
            risk_level=parsed.get("risk_level", "Low"),
            suggestion=parsed.get("suggestion", "Take a slow breath and continue when you're ready."),
        )
    except (RuntimeError, httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError):
        result = keyword_score(body.message)
        return AnalysisResult(
            reply="Thanks for sharing that — I'm listening. Want to tell me a bit more about what's on your mind?",
            mood=result["mood"],
            rumination_score=result["rumination_score"],
            risk_level=result["risk_level"],
            suggestion=result["suggestion"],
        )


@router.post("/analyze-journal", response_model=AnalysisResult)
async def analyze_journal(body: JournalAnalyzeRequest):
    context = (
        f"Mood selected: {body.mood or 'not specified'}. "
        f"Stress slider: {body.stress_level if body.stress_level is not None else 'not specified'}/100.\n\n"
        f"Journal entry:\n{body.text}"
    )

    try:
        parsed = await call_claude(JOURNAL_SYSTEM_PROMPT, [{"role": "user", "content": context}])
        return AnalysisResult(
            mood=parsed.get("mood", "Neutral"),
            rumination_score=int(parsed.get("rumination_score", 30)),
            risk_level=parsed.get("risk_level", "Low"),
            suggestion=parsed.get("suggestion", "Consider a short break before continuing your day."),
            overthinking_percent=parsed.get("overthinking_percent"),
            anxiety_risk=parsed.get("anxiety_risk"),
            summary=parsed.get("summary"),
        )
    except (RuntimeError, httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError):
        result = keyword_score(body.text)
        return AnalysisResult(
            mood=result["mood"],
            rumination_score=result["rumination_score"],
            risk_level=result["risk_level"],
            suggestion=result["suggestion"],
            overthinking_percent=result["rumination_score"],
            anxiety_risk=result["risk_level"],
            summary="Automated summary unavailable (no AI key configured) — showing keyword-based estimate.",
        )
