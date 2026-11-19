from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List

from app.core.database import get_db
from app.models.warehouse import FactAspectSentiment
from app.schemas.innovation import PainIndexRequest
from app.services.pain_index.calculator import calculate_pain_index

router = APIRouter()


def format_pain_result(res: dict) -> dict:
    bk = res.get("breakdown", {})
    return {
        "aspect": res.get("aspect_name"),
        "aspect_name": res.get("aspect_name"),
        "pain_score": res.get("score", 0.0),
        "score": res.get("score", 0.0),
        "neg_pct": bk.get("neg_pct", {}).get("raw", 0.0),
        "frequency": bk.get("freq", {}).get("raw", 0),
        "recency_growth": bk.get("recency", {}).get("raw", 0.0),
        "rating_impact": bk.get("rating_impact", {}).get("raw", 0.0),
        "mention_count": res.get("review_count", 0),
        "negative_count": res.get("negative_count", 0),
        "factor_breakdown": {
            "neg_pct_contribution": bk.get("neg_pct", {}).get("contribution", 0.0),
            "freq_contribution": bk.get("freq", {}).get("contribution", 0.0),
            "recency_contribution": bk.get("recency", {}).get("contribution", 0.0),
            "rating_impact_contribution": bk.get("rating_impact", {}).get("contribution", 0.0),
        },
        "breakdown": bk,
        "calculation_timestamp": res.get("calculation_timestamp")
    }


@router.get("/innovation/pain-index/results")
def get_pain_index_results(dataset_id: int = Query(...), db: Session = Depends(get_db)):
    aspects = (
        db.query(FactAspectSentiment.aspect_name)
        .filter(FactAspectSentiment.dataset_id == dataset_id)
        .distinct()
        .all()
    )
    results = []
    for (aspect_name,) in aspects:
        res = calculate_pain_index(db, dataset_id, aspect_name)
        results.append(format_pain_result(res))

    results.sort(key=lambda x: x["pain_score"], reverse=True)
    return results


@router.post("/innovation/pain-index/calculate")
def calculate_pain_index_frontend(
    dataset_id: int = Query(...),
    payload: Optional[Dict[str, Any]] = Body(None),
    db: Session = Depends(get_db)
):
    weights = payload.get("weights") if payload else None
    aspect_name = payload.get("aspect_name") if payload else None

    aspects = (
        [aspect_name]
        if aspect_name
        else [
            a[0]
            for a in db.query(FactAspectSentiment.aspect_name)
            .filter(FactAspectSentiment.dataset_id == dataset_id)
            .distinct()
            .all()
        ]
    )

    results = []
    for asp in aspects:
        res = calculate_pain_index(db, dataset_id, asp, weights)
        results.append(format_pain_result(res))

    results.sort(key=lambda x: x["pain_score"], reverse=True)
    return results


# Legacy Endpoints
@router.get("/datasets/{dataset_id}/pain-index")
def get_all_pain_indices(dataset_id: int, db: Session = Depends(get_db)):
    return get_pain_index_results(dataset_id, db)


@router.post("/datasets/{dataset_id}/pain-index/calculate")
def calculate_aspect_pain_index(dataset_id: int, req: PainIndexRequest, db: Session = Depends(get_db)):
    res = calculate_pain_index(db, dataset_id, req.aspect_name, req.weights)
    return format_pain_result(res)
