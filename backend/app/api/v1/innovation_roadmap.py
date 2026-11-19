from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.core.database import get_db
from app.models.warehouse import RoadmapScenario
from app.models.feature_requests import EffortEstimate
from app.schemas.innovation import RoadmapScenarioCreate, EffortEstimateCreate
from app.services.recommendations.simulator import simulate_roadmap

router = APIRouter()


def format_scenario(s: RoadmapScenario) -> dict:
    improvements = s.improvements or []
    selected = [imp.get("aspect") or imp.get("aspect_name") for imp in improvements if imp.get("aspect") or imp.get("aspect_name")]
    effort_map = {
        (imp.get("aspect") or imp.get("aspect_name")): float(imp.get("effort") or imp.get("effort_estimate") or 5.0)
        for imp in improvements
    }

    return {
        "id": s.scenario_id,
        "scenario_id": s.scenario_id,
        "name": s.name,
        "dataset_id": s.dataset_id,
        "selected_aspects": selected,
        "effort_estimates": effort_map,
        "created_at": s.created_at.isoformat() if s.created_at else "2024-01-01",
        "estimated_impact": {
            "reviews_addressed": s.total_reviews_addressed or 0,
            "aspects_resolved": len(selected),
            "pain_reduction": round(float(s.estimated_pain_reduction or 0.0), 1),
            "improvements": [
                {
                    "aspect": imp.get("aspect") or imp.get("aspect_name"),
                    "pain_score": round(float(imp.get("pain_score") or imp.get("pain_index") or 50.0), 1),
                    "effort": float(imp.get("effort") or 5.0),
                    "reviews": int(imp.get("reviews") or imp.get("reviews_addressed") or 20)
                }
                for imp in improvements
            ]
        },
        "is_estimate": s.is_estimate,
        "estimate_disclaimer": s.estimate_disclaimer
    }


@router.post("/innovation/roadmap/simulate")
def run_roadmap_simulation_frontend(payload: dict = Body(...), db: Session = Depends(get_db)):
    dataset_id = payload.get("dataset_id") or 1
    scenario_name = payload.get("scenario_name") or payload.get("name") or "New Scenario"
    improvements = payload.get("improvements") or []

    res = simulate_roadmap(db, dataset_id, scenario_name, improvements)

    # Save scenario
    scenario = RoadmapScenario(
        dataset_id=dataset_id,
        name=scenario_name,
        improvements=improvements,
        total_reviews_addressed=res.get("reviews_addressed", 0),
        estimated_pain_reduction=res.get("estimated_pain_reduction", 0.0),
        is_estimate=True,
        estimate_disclaimer="This is an estimated planning scenario, not a guaranteed business outcome."
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    return format_scenario(scenario)


@router.get("/innovation/roadmap/scenarios")
def list_roadmap_scenarios_frontend(dataset_id: int = Query(...), db: Session = Depends(get_db)):
    scenarios = (
        db.query(RoadmapScenario)
        .filter(RoadmapScenario.dataset_id == dataset_id)
        .order_by(RoadmapScenario.scenario_id.desc())
        .all()
    )
    return [format_scenario(s) for s in scenarios]


# Legacy Endpoints
@router.post("/datasets/{dataset_id}/roadmap/simulate")
def run_roadmap_simulation(dataset_id: int, req: RoadmapScenarioCreate, db: Session = Depends(get_db)):
    return simulate_roadmap(db, dataset_id, req.scenario_name, req.improvements)


@router.get("/datasets/{dataset_id}/roadmap/scenarios")
def list_roadmap_scenarios(dataset_id: int, db: Session = Depends(get_db)):
    scenarios = db.query(RoadmapScenario).filter(RoadmapScenario.dataset_id == dataset_id).order_by(RoadmapScenario.scenario_id.desc()).all()
    return [format_scenario(s) for s in scenarios]


@router.get("/datasets/{dataset_id}/roadmap/efforts")
def get_effort_estimates(dataset_id: int, db: Session = Depends(get_db)):
    efforts = db.query(EffortEstimate).filter(EffortEstimate.dataset_id == dataset_id).all()
    return [{"aspect_name": e.aspect_name, "effort_score": e.effort_score} for e in efforts]


@router.post("/datasets/{dataset_id}/roadmap/efforts")
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
