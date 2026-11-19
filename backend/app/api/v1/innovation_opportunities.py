from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.warehouse import FactAspectSentiment, DimProduct, FactReview
from app.services.pain_index.calculator import calculate_pain_index
from app.services.emerging.detector import detect_emerging_complaints

router = APIRouter(prefix="/datasets")


@router.get("/{dataset_id}/opportunities")
def get_innovation_opportunities(dataset_id: int, db: Session = Depends(get_db)):
    """
    Ranks product improvement opportunities by aggregating pain index,
    growth trend, and customer impact.
    """
    # Get all aspects in this dataset
    aspects = (
        db.query(FactAspectSentiment.aspect_name)
        .filter(FactAspectSentiment.dataset_id == dataset_id)
        .distinct()
        .all()
    )

    emerging = detect_emerging_complaints(db, dataset_id)
    trend_map = {r["aspect_name"]: r["trend_label"] for r in emerging.get("results", [])}

    opportunities = []
    for (asp,) in aspects:
        pain = calculate_pain_index(db, dataset_id, asp)
        score = pain.get("score", 0.0)
        neg_count = pain.get("negative_count", 0)
        trend = trend_map.get(asp, "stable")

        # Opportunity score = combination of pain index and trend weighting
        trend_mult = 1.3 if trend == "emerging" else (1.15 if trend == "rising" else 1.0)
        opp_score = round(score * trend_mult, 2)

        # Most impacted products
        top_prods = (
            db.query(DimProduct.product_name, func.count(FactAspectSentiment.aspect_id))
            .join(FactReview, FactAspectSentiment.fact_id == FactReview.fact_id)
            .join(DimProduct, FactReview.product_sk == DimProduct.product_sk)
            .filter(
                FactAspectSentiment.dataset_id == dataset_id,
                FactAspectSentiment.aspect_name == asp,
                FactAspectSentiment.aspect_label == "negative"
            )
            .group_by(DimProduct.product_name)
            .order_by(func.count(FactAspectSentiment.aspect_id).desc())
            .limit(3)
            .all()
        )

        opportunities.append({
            "aspect_name": asp,
            "opportunity_score": opp_score,
            "pain_index": score,
            "negative_count": neg_count,
            "trend": trend,
            "top_affected_products": [{"product_name": p[0], "negative_mentions": p[1]} for p in top_prods]
        })

    opportunities.sort(key=lambda x: x["opportunity_score"], reverse=True)
    return opportunities
