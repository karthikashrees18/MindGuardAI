from typing import Any, List, Optional, Literal
from pydantic import BaseModel


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    history: List[ChatTurn] = []
    message: str


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


class JournalAnalyzeRequest(BaseModel):
    text: str
    mood: Optional[str] = None
    stress_level: Optional[int] = None
