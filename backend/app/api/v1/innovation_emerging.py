from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.emerging.detector import detect_emerging_complaints

router = APIRouter()


def format_emerging_item(r: dict) -> dict:
    dq = r.get("data_quality", "sufficient")
    if dq == "insufficient_prior_data" or dq == "insufficient_recent_data":
        data_quality = "insufficient"
    elif dq == "newly_appearing":
        data_quality = "limited"
    else:
        data_quality = "sufficient"

    trend_raw = r.get("trend_label", "stable")
    if trend_raw in ["emerging", "rising"]:
        trend = "emerging"
    elif trend_raw == "declining":
        trend = "declining"
    else:
        trend = "stable"

    samples = []
    for i, s in enumerate(r.get("sample_reviews", [])):
        samples.append({
            "id": i + 1,
            "text": s.get("text", ""),
            "rating": 2,
            "date": s.get("date", "2024-01-01"),
            "product": "Product",
            "sentiment": "negative"
        })

    return {
        "aspect": r.get("aspect_name"),
        "recent_count": r.get("recent_count", 0),
        "prior_count": r.get("prior_count", 0),
        "growth_rate": round(r.get("growth_rate", 0.0), 2),
        "data_quality": data_quality,
        "sample_reviews": samples,
        "trend": trend,
        "comparison_period": r.get("comparison_period")
    }


@router.get("/innovation/emerging-complaints")
def get_emerging_complaints_frontend(
    dataset_id: int = Query(...),
    recent_days: int = Query(60),
    prior_days: int = Query(60),
    db: Session = Depends(get_db)
):
    raw_res = detect_emerging_complaints(db, dataset_id, recent_days=recent_days, prior_days=prior_days)
    results = [format_emerging_item(r) for r in raw_res.get("results", [])]
    return results


# Legacy Endpoint
@router.get("/datasets/{dataset_id}/emerging-complaints")
def get_emerging_complaints_legacy(
    dataset_id: int,
    recent_days: int = 60,
    prior_days: int = 60,
    db: Session = Depends(get_db)
):
    return detect_emerging_complaints(db, dataset_id, recent_days=recent_days, prior_days=prior_days)
