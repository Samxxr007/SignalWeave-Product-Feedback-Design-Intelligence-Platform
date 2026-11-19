from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.warehouse import RoadmapScenario
from app.models.feature_requests import EffortEstimate
from app.schemas.innovation import RoadmapScenarioCreate, EffortEstimateCreate
from app.services.recommendations.simulator import simulate_roadmap

router = APIRouter(prefix="/datasets")


@router.post("/{dataset_id}/roadmap/simulate")
def run_roadmap_simulation(dataset_id: int, req: RoadmapScenarioCreate, db: Session = Depends(get_db)):
    res = simulate_roadmap(db, dataset_id, req.scenario_name, req.improvements)
    return res


@router.get("/{dataset_id}/roadmap/scenarios")
def list_roadmap_scenarios(dataset_id: int, db: Session = Depends(get_db)):
    scenarios = db.query(RoadmapScenario).filter(RoadmapScenario.dataset_id == dataset_id).order_by(RoadmapScenario.scenario_id.desc()).all()
    return [
        {
            "scenario_id": s.scenario_id,
            "name": s.name,
            "improvements": s.improvements,
            "total_reviews_addressed": s.total_reviews_addressed,
            "estimated_pain_reduction": s.estimated_pain_reduction,
            "is_estimate": s.is_estimate,
            "estimate_disclaimer": s.estimate_disclaimer,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in scenarios
    ]


@router.get("/{dataset_id}/roadmap/efforts")
def get_effort_estimates(dataset_id: int, db: Session = Depends(get_db)):
    efforts = db.query(EffortEstimate).filter(EffortEstimate.dataset_id == dataset_id).all()
    return [{"aspect_name": e.aspect_name, "effort_score": e.effort_score} for e in efforts]


@router.post("/{dataset_id}/roadmap/efforts")
def save_effort_estimate(dataset_id: int, req: EffortEstimateCreate, db: Session = Depends(get_db)):
    existing = db.query(EffortEstimate).filter(
        EffortEstimate.dataset_id == dataset_id,
        EffortEstimate.aspect_name == req.aspect_name
    ).first()
    if existing:
        existing.effort_score = req.effort_score
    else:
        existing = EffortEstimate(
            dataset_id=dataset_id,
            aspect_name=req.aspect_name,
            effort_score=req.effort_score
        )
        db.add(existing)

    db.commit()
    return {"status": "saved", "aspect_name": req.aspect_name, "effort_score": req.effort_score}
