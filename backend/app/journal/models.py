from typing import Optional, List
from pydantic import BaseModel


class JournalCreate(BaseModel):
    user_id: str
    text: str
    mood: Optional[str] = None
    stress_level: Optional[int] = None
    rumination_score: Optional[int] = None
    risk_level: Optional[str] = None


class JournalOut(BaseModel):
    id: str
    user_id: str
    text: str
    mood: Optional[str]
    stress_level: Optional[int]
    rumination_score: Optional[int]
    risk_level: Optional[str]
    created_at: str


class ReportsSummary(BaseModel):
    total_entries: int
    average_rumination_score: Optional[float]
    trend: str
    recent_scores: List[int]
