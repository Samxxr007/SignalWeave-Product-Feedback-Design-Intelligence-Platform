from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class DatasetCreate(BaseModel):
    name: str
    file_type: Optional[str] = "csv"
    is_sample: Optional[bool] = False


class DatasetOut(BaseModel):
    id: int
    name: str
    file_type: Optional[str] = None
    file_path: Optional[str] = None
    total_records: int
    staged_records: int
    valid_records: int
    rejected_records: int
    warehouse_records: int
    status: str
    uploaded_at: datetime
    column_mapping: Optional[Dict[str, str]] = None
    is_sample: bool

    class Config:
        from_attributes = True


class ColumnMappingRequest(BaseModel):
    column_mapping: Dict[str, str]


class ValidationSummary(BaseModel):
    dataset_id: int
    total_records: int
    passed_count: int
    failed_count: int
    warnings: List[str]
    sample_errors: List[Dict[str, Any]]
