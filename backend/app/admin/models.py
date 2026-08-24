from typing import List, Literal, Optional
from pydantic import BaseModel, Field

Period = Literal["7d", "30d", "semester"]


# --- Cohort distress distribution + top-line KPIs -----------------------

class RiskTierCounts(BaseModel):
    """Active-student counts per risk tier, bucketed on each student's
    average rumination_score for the period (0-25 Normal, 26-50 Mild,
    51-75 Moderate, 76-100 High Distress)."""
    normal: int = 0
    mild: int = 0
    moderate: int = 0
    high_distress: int = 0


class RiskTierPercent(BaseModel):
    normal: float = 0
    mild: float = 0
    moderate: float = 0
    high_distress: float = 0


class KpiSummary(BaseModel):
    total_active_students: int
    wellness_index: Optional[float] = None  # 0-100, higher = better
    high_moderate_risk_percent: float = 0
    weekly_checkin_completion_rate: float = 0


class AnomalyAlert(BaseModel):
    group: str
    change_percent: float
    message: str


class AggregateStatsResponse(BaseModel):
    period: Period
    sample_size: int  # distinct students with >=1 journal entry in the period
    kpis: KpiSummary
    risk_distribution: RiskTierCounts
    risk_distribution_percent: RiskTierPercent
    anomalies: List[AnomalyAlert] = []
    generated_at: str


# --- Temporal trend analysis ---------------------------------------------

class TrendPoint(BaseModel):
    date: str  # ISO date, one point per day
    average_sentiment: Optional[float] = None  # 0-100, higher = better
    entry_count: int


class CohortTrendsResponse(BaseModel):
    period: Period
    points: List[TrendPoint]


# --- Department / cohort breakdown (k-anonymized) -----------------------

class DepartmentBucket(BaseModel):
    label: str
    student_count: int
    risk_distribution: RiskTierCounts
    suppressed: bool = False  # true if folded into "Other / Insufficient Data"


class DepartmentBreakdownResponse(BaseModel):
    period: Period
    group_by: Literal["department", "year_of_study"]
    k_threshold: int
    buckets: List[DepartmentBucket]


# --- Top reported stress factors -----------------------------------------

class StressFactor(BaseModel):
    tag: str
    count: int


class StressFactorsResponse(BaseModel):
    period: Period
    k_threshold: int
    factors: List[StressFactor]


# --- Counselor resource utilization ---------------------------------------

class ResourceUtilization(BaseModel):
    period: Period
    helpline_taps: int
    counselor_contacts: int
    trusted_contact_alerts: int


# --- Broadcast / proactive intervention tool -------------------------------

class BroadcastCreate(BaseModel):
    title: str = Field(min_length=1, max_length=140)
    message: str = Field(min_length=1, max_length=1000)
    # Free-text aggregate target description, e.g. "All Students",
    # "3rd Year Students", "CSE Department". Never a student identifier —
    # the broadcast is fanned out to whoever matches the description at
    # send time, not to a stored list of individuals.
    target_group: str = Field(min_length=1, max_length=120)


class BroadcastOut(BaseModel):
    id: str
    title: str
    message: str
    target_group: str
    created_by: str  # counselor/admin display name, never a student identity
    created_at: str


# --- Audit trail -----------------------------------------------------------

class AuditLogEntry(BaseModel):
    id: str
    actor_id: str
    actor_name: str
    endpoint: str
    params: dict
    created_at: str