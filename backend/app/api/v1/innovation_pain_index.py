from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.warehouse import FactAspectSentiment
from app.schemas.innovation import PainIndexRequest
from app.services.pain_index.calculator import calculate_pain_index

router = APIRouter(prefix="/datasets")


@router.get("/{dataset_id}/pain-index")
def get_all_pain_indices(dataset_id: int, db: Session = Depends(get_db)):
    aspects = (
        db.query(FactAspectSentiment.aspect_name)
        .filter(FactAspectSentiment.dataset_id == dataset_id)
        .distinct()
        .all()
    )
    results = []
    for (aspect_name,) in aspects:
        res = calculate_pain_index(db, dataset_id, aspect_name)
        results.append(res)

    results.sort(key=lambda x: x["score"], reverse=True)
    return results


@router.post("/{dataset_id}/pain-index/calculate")
def calculate_aspect_pain_index(dataset_id: int, req: PainIndexRequest, db: Session = Depends(get_db)):
    return calculate_pain_index(db, dataset_id, req.aspect_name, req.weights)
