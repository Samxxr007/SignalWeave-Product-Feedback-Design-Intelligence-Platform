from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional

from app.core.database import get_db
from app.models.warehouse import FactAspectSentiment, DimProduct, FactReview
from app.models.feature_requests import EffortEstimate
from app.services.pain_index.calculator import calculate_pain_index
from app.services.emerging.detector import detect_emerging_complaints

router = APIRouter()


@router.get("/innovation/opportunity-map")
def get_opportunity_map_frontend(dataset_id: int = Query(...), db: Session = Depends(get_db)):
    aspects = (
        db.query(FactAspectSentiment.aspect_name)
        .filter(FactAspectSentiment.dataset_id == dataset_id)
        .distinct()
        .all()
    )

    # Fetch stored effort estimates
    stored_efforts = {
        e.aspect_name: e.effort_score
        for e in db.query(EffortEstimate).filter(EffortEstimate.dataset_id == dataset_id).all()
    }

    # Default effort mappings for demonstration if not yet manually set
    default_efforts = {
        "battery": 6.5,
        "performance": 7.0,
        "sound_quality": 4.5,
        "display": 8.0,
        "build_quality": 5.5,
        "connectivity": 4.0,
        "camera": 7.5,
        "price_value": 3.0,
        "comfort": 3.5,
        "customer_support": 2.5
    }

    items = []
    for (asp,) in aspects:
        pain = calculate_pain_index(db, dataset_id, asp)
        score = round(pain.get("score", 50.0), 1)
        mentions = pain.get("review_count", 10)
        effort = stored_efforts.get(asp, default_efforts.get(asp, 5.0))

        if score >= 60:
            quadrant = "quick_win" if effort < 5.0 else "strategic"
        else:
            quadrant = "low_priority" if effort < 5.0 else "investigate"

        items.append({
            "aspect": asp,
            "pain_score": score,
            "effort_estimate": round(float(effort), 1),
            "mention_count": mentions,
            "quadrant": quadrant
        })

    items.sort(key=lambda x: x["pain_score"], reverse=True)
    return items


@router.post("/innovation/effort-estimate")
def save_effort_estimate_frontend(payload: dict = Body(...), db: Session = Depends(get_db)):
    dataset_id = payload.get("dataset_id")
    aspect_name = payload.get("aspect_name")
    effort_score = payload.get("effort") or payload.get("effort_score") or 5.0

    existing = db.query(EffortEstimate).filter(
        EffortEstimate.dataset_id == dataset_id,
        EffortEstimate.aspect_name == aspect_name
    ).first()

    if existing:
        existing.effort_score = effort_score
    else:
        existing = EffortEstimate(
            dataset_id=dataset_id,
            aspect_name=aspect_name,
            effort_score=effort_score
        )
        db.add(existing)

    db.commit()
    return {"status": "saved", "aspect": aspect_name, "effort_estimate": effort_score}


# Legacy Endpoints
@router.get("/datasets/{dataset_id}/opportunities")
def get_innovation_opportunities_legacy(dataset_id: int, db: Session = Depends(get_db)):
    return get_opportunity_map_frontend(dataset_id, db)
