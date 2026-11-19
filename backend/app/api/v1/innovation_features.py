from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.warehouse import FactReview, DimProduct
from app.models.feature_requests import FeatureRequest
from app.schemas.innovation import FeatureRequestUpdate
from app.services.features.extractor import extract_feature_requests, group_into_themes

router = APIRouter()


@router.post("/datasets/{dataset_id}/features/extract")
def trigger_feature_extraction(dataset_id: int, db: Session = Depends(get_db)):
    # Clear existing
    db.query(FeatureRequest).filter(FeatureRequest.dataset_id == dataset_id).delete()

    reviews = (
        db.query(FactReview, DimProduct.product_name)
        .join(DimProduct, FactReview.product_sk == DimProduct.product_sk, isouter=True)
        .filter(FactReview.dataset_id == dataset_id)
        .all()
    )

    review_dicts = [
        {
            "fact_id": r[0].fact_id,
            "text": r[0].review_text_clean or r[0].review_text_original or "",
            "product_id": r[0].product.product_id if r[0].product else None,
            "product_name": r[1] or "Unknown"
        }
        for r in reviews
    ]

    extracted = extract_feature_requests(review_dicts, dataset_id)
    grouped = group_into_themes(extracted)

    for item in grouped:
        fr = FeatureRequest(
            dataset_id=dataset_id,
            theme=item.get("theme"),
            raw_text=item.get("raw_text"),
            product_id=item.get("product_id"),
            product_name=item.get("product_name"),
            review_id=item.get("review_id"),
            confidence_score=item.get("confidence_score"),
            analyst_confirmed=item.get("analyst_confirmed"),
            pattern_matched=item.get("pattern_matched")
        )
        db.add(fr)

    db.commit()
    return {"dataset_id": dataset_id, "extracted_count": len(grouped)}


@router.get("/datasets/{dataset_id}/features")
def get_features(dataset_id: int, db: Session = Depends(get_db)):
    requests = db.query(FeatureRequest).filter(FeatureRequest.dataset_id == dataset_id).all()
    return [
        {
            "id": r.id,
            "theme": r.theme,
            "raw_text": r.raw_text,
            "product_id": r.product_id,
            "product_name": r.product_name,
            "confidence_score": r.confidence_score,
            "analyst_confirmed": r.analyst_confirmed,
            "pattern_matched": r.pattern_matched,
            "extracted_at": r.extracted_at.isoformat() if r.extracted_at else None
        }
        for r in requests
    ]


@router.patch("/features/{feature_id}")
def update_feature_confirmation(feature_id: int, req: FeatureRequestUpdate, db: Session = Depends(get_db)):
    fr = db.query(FeatureRequest).filter(FeatureRequest.id == feature_id).first()
    if not fr:
        raise HTTPException(status_code=404, detail="Feature request not found")

    fr.analyst_confirmed = req.analyst_confirmed
    db.commit()
    return {"id": fr.id, "analyst_confirmed": fr.analyst_confirmed}
