from typing import Any, List, Optional, Literal
from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    history: List[ChatTurn] = []
    message: str = Field(min_length=1, max_length=2000)


class AnalysisResult(BaseModel):
    reply: Optional[str] = None
    mood: str
    rumination_score: int
    risk_level: Literal["Low", "Moderate", "High"]
    suggestion: str
    overthinking_percent: Optional[int] = None
    anxiety_risk: Optional[str] = None
    summary: Optional[str] = None
    # --- additive fields from the two-engine pipeline ---
    sentiment: Optional[float] = None
    stress_intensity: Optional[int] = None
    category: Optional[dict] = None
    markers: Optional[dict] = None
    factors: Optional[List[dict]] = None
    crisis: Optional[bool] = None
    engine: Optional[str] = None
    # chat only: set when this message pushed the student over an escalation rule
    early_warning: Optional[bool] = None
    interventions: Optional[List[Any]] = None
    # chat only: true when the LLM call failed and `reply` is an error notice,
    # not a model answer (the client must not add it to the conversation history)
    llm_error: Optional[bool] = None


class JournalAnalyzeRequest(BaseModel):
    text: str
    mood: Optional[str] = None
    stress_level: Optional[int] = None
