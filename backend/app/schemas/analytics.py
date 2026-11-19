from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class RollupRequest(BaseModel):
    dimensions: List[str]
    measure: str = "count"
    filters: Optional[Dict[str, Any]] = None


class DrilldownRequest(BaseModel):
    dimension: str
    value: str
    child_dimension: str
    filters: Optional[Dict[str, Any]] = None


class SliceRequest(BaseModel):
    dimension: str
    value: str
    other_dimensions: List[str]
    measure: str = "avg_rating"


class DiceRequest(BaseModel):
    filters: Dict[str, Any]
    dimensions: List[str]
    measure: str = "count"


class PivotRequest(BaseModel):
    row_dim: str
    col_dim: str
    measure: str = "avg_rating"
    filters: Optional[Dict[str, Any]] = None
