import logging
from typing import Optional

from fastapi import APIRouter, Depends

from app.ai.analysis import LLMError, analyze_entry, call_llm, llm_configured
from app.ai.models import AnalysisResult, ChatRequest, JournalAnalyzeRequest
from app.auth.utils import get_optional_user
from app.config import GROQ_MODEL
from app.journal.service import process_entry, recent_scores

logger = logging.getLogger("ai")
router = APIRouter(prefix="/api/ai", tags=["ai"])

# Only the most recent turns are sent: enough for real memory of the dialogue,
# small enough to stay fast and well inside the model's context window.
MAX_HISTORY_TURNS = 20

CHAT_SYSTEM_PROMPT = """You are the AI companion inside "Mind Guard AI", a mental-wellness app for university students. You are warm, grounded and genuinely curious — a caring, emotionally intelligent friend and an active listener, not a therapist and never clinical or scripted.

How you talk:
- Respond to what THIS student just said, using the whole conversation so far. Refer back to details they shared earlier (exams, people, feelings) so they feel heard and remembered.
- Reflect the feeling in your own words, validate it, then ask at most ONE open, specific follow-up question. Sometimes just reflect and invite them to continue instead of asking.
- NEVER repeat a sentence, opening, or question you already used in this conversation. Vary your wording every turn. Avoid stock phrases like "I hear you", "That sounds tough", or "Anything you'd like to hold on to".
- If the student is upbeat, celebrate it specifically and explore what made it work. If they are stuck in a worry loop, name the loop gently and help shrink it to one small next step. Suggest breathing, a walk, music or the Calm space only when it fits, never as a reflex.
- Keep replies to 2-4 sentences, plain conversational text. No lists, headings, markdown or emojis spam.
- Student-wellness focus: study stress, sleep, workload, friendships, homesickness, self-doubt.
- You are not a doctor: do not diagnose or prescribe.
- If they mention self-harm, suicide or not wanting to live, respond with calm care, tell them they deserve support right now, and encourage them to contact the campus counselor, someone they trust, or a crisis line immediately (the app's Support tab connects them in one tap)."""

CRISIS_REPLY = (
    "I'm really glad you told me. What you're feeling matters, and you deserve support right now — "
    "please reach out to a counselor, someone you trust, or a crisis line. I can connect you with the "
    "campus counselor in one tap from the Support tab."
)

NOT_CONFIGURED_REPLY = (
    "The AI companion isn't set up on this server yet (the Groq API key is missing), so I can't chat right now. "
    "Your check-in scores still work. If you run this app, set GROQ_API_KEY on the backend."
)

LLM_FAILED_REPLY = (
    "I couldn't reach the AI service just now, so I don't want to give you a half-answer. "
    "Please try sending that again in a moment — nothing you wrote was lost."
)


def _conversation(body: ChatRequest) -> list:
    turns = [{"role": t.role, "content": t.content} for t in body.history if t.content.strip()]
    turns = turns[-MAX_HISTORY_TURNS:]
    return [{"role": "system", "content": CHAT_SYSTEM_PROMPT}, *turns, {"role": "user", "content": body.message}]


async def _llm_reply(body: ChatRequest) -> tuple[Optional[str], Optional[str]]:
    """(reply, error_message). Exactly one is set. Failures are logged by call_llm."""
    if not llm_configured():
        logger.error("Chat requested but GROQ_API_KEY is not configured")
        return None, NOT_CONFIGURED_REPLY
    try:
        return await call_llm(_conversation(body), max_tokens=400, temperature=0.8), None
    except LLMError as exc:
        logger.error("Companion chat failed: %s", exc.reason)
        return None, LLM_FAILED_REPLY


def _user_context(body: ChatRequest) -> Optional[str]:
    prior = [t.content for t in body.history if t.role == "user"][-4:]
    return "\n".join(f"- {c[:300]}" for c in prior) or None


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
async def ai_health(probe: bool = False):
    """`?probe=true` makes one tiny real Groq call and reports the outcome, so a
    misconfigured key/model can be diagnosed without server logs. The key is never returned."""
    out = {"ai_backend": "groq" if llm_configured() else "keyword-fallback", "model": GROQ_MODEL if llm_configured() else None}
    if probe and llm_configured():
        try:
            await call_llm([{"role": "user", "content": "Reply with the single word: ok"}], max_tokens=5, temperature=0)
            out["probe"] = "ok"
        except LLMError as exc:
            out["probe"] = "failed"
            out["probe_error"] = exc.reason[:300]
    return out


@router.post("/chat", response_model=AnalysisResult)
async def chat(body: ChatRequest, user=Depends(get_optional_user)):
    """Companion chat. The full conversation is sent to Groq on every turn; the
    live wellness signal comes from the same two-engine pipeline as check-ins
    (engine 1 also reads the student's earlier turns for context). Signed-in
    students get personalised scoring and the message counts toward their
    trend, early-warning rules and garden."""
    reply, error = await _llm_reply(body)
    context = _user_context(body)

    if user and user.get("role", "student") == "student":
        result = await process_entry(user, body.message, source="chat", context=context)
        a = result["analysis"]
        return _to_result(
            a,
            reply=reply or (CRISIS_REPLY if a["crisis"] else error),
            llm_error=bool(error),
            early_warning=result["early_warning"]["show_prompt"],
            interventions=result["interventions"]["cards"],
        )

    a = await analyze_entry(body.message, context=context)
    return _to_result(a, reply=reply or (CRISIS_REPLY if a["crisis"] else error), llm_error=bool(error))


@router.post("/analyze-journal", response_model=AnalysisResult)
async def analyze_journal(body: JournalAnalyzeRequest, user=Depends(get_optional_user)):
    """Stateless analysis (nothing is stored). Personalised when signed in."""
    baseline = (user or {}).get("baseline") or {}
    history = await recent_scores(user["_id"]) if user else []
    a = await analyze_entry(body.text, stress_slider=body.stress_level, baseline=baseline, recent_scores=history)
    return _to_result(a)
