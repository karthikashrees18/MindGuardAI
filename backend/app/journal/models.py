from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


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
    # additive — present on entries created through /api/checkins or chat
    source: Optional[str] = None
    mood_label: Optional[str] = None
    category: Optional[str] = None
    sentiment: Optional[float] = None
    stress_intensity: Optional[int] = None
    triggers_detected: Optional[List[str]] = None


class ReportsSummary(BaseModel):
    total_entries: int
    average_rumination_score: Optional[float]
    trend: str
    recent_scores: List[int]
    # additive
    recent: List[Dict[str, Any]] = []
    category_counts: Dict[str, int] = {}
    top_triggers: List[Dict[str, Any]] = []
    best_hour: Optional[int] = None


class CheckinRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    mood: Optional[str] = None            # the emoji / label the student tapped
    stress_level: Optional[int] = Field(default=None, ge=0, le=100)
    source: Literal["checkin", "vent", "reflection"] = "checkin"


class CheckinResponse(BaseModel):
    entry: JournalOut
    analysis: Dict[str, Any]
    interventions: Dict[str, Any]
    early_warning: Dict[str, Any]
    garden: Dict[str, Any]
    first_checkin_today: bool
