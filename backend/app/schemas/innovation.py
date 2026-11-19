from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class PainIndexRequest(BaseModel):
    aspect_name: str
    weights: Optional[Dict[str, float]] = None


class RoadmapScenarioCreate(BaseModel):
    scenario_name: str
    improvements: List[Dict[str, Any]]


class FeatureRequestUpdate(BaseModel):
    analyst_confirmed: bool


class EffortEstimateCreate(BaseModel):
    aspect_name: str
    effort_score: float
