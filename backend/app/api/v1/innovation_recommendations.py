from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.warehouse import Recommendation
from app.services.recommendations.engine import generate_recommendations

router = APIRouter(prefix="/datasets")


@router.post("/{dataset_id}/recommendations/generate")
def trigger_recommendations(dataset_id: int, db: Session = Depends(get_db)):
    results = generate_recommendations(db, dataset_id)
    return {
        "dataset_id": dataset_id,
        "recommendations_generated": len(results),
        "results": results
    }


@router.get("/{dataset_id}/recommendations")
def get_recommendations(dataset_id: int, priority: str = None, db: Session = Depends(get_db)):
    q = db.query(Recommendation).filter(Recommendation.dataset_id == dataset_id)
    if priority:
        q = q.filter(Recommendation.priority == priority.lower())

    recs = q.order_by(Recommendation.pain_index.desc()).all()
    return [
        {
            "rec_id": r.rec_id,
            "product_id": r.product_id,
            "product_name": r.product_name,
            "aspect_name": r.aspect_name,
            "pain_index": r.pain_index,
            "priority": r.priority,
            "negative_count": r.negative_count,
            "total_count": r.total_count,
            "suggested_improvement": r.suggested_improvement,
            "trend_direction": r.trend_direction,
            "evidence_reviews": r.evidence_reviews,
            "pain_index_breakdown": r.pain_index_breakdown,
            "generated_at": r.generated_at.isoformat() if r.generated_at else None
        }
        for r in recs
    ]
