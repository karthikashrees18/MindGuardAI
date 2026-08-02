from typing import List, Optional, Literal
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


class JournalAnalyzeRequest(BaseModel):
    text: str
    mood: Optional[str] = None
    stress_level: Optional[int] = None
