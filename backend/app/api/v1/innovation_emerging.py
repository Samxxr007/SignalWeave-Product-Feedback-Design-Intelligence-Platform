from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.emerging.detector import detect_emerging_complaints

router = APIRouter(prefix="/datasets")


@router.get("/{dataset_id}/emerging-complaints")
def get_emerging_complaints(dataset_id: int, recent_days: int = 60, prior_days: int = 60, db: Session = Depends(get_db)):
    return detect_emerging_complaints(db, dataset_id, recent_days=recent_days, prior_days=prior_days)
