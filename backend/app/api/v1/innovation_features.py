from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.models.warehouse import FactReview, DimProduct
from app.models.feature_requests import FeatureRequest
from app.schemas.innovation import FeatureRequestUpdate
from app.services.features.extractor import extract_feature_requests, group_into_themes

router = APIRouter()


def format_feature_request(r: FeatureRequest) -> dict:
    if r.analyst_confirmed is True:
        st = "confirmed"
    elif r.analyst_confirmed is False:
        st = "rejected"
    else:
        st = "pending"

    return {
        "id": r.id,
        "raw_text": r.raw_text or "",
        "pattern_matched": r.pattern_matched or "customer_request",
        "confidence": round(float(r.confidence_score or 0.8), 2),
        "product": r.product_name or "General",
        "status": st,
        "created_at": r.extracted_at.isoformat() if r.extracted_at else "2024-01-01"
    }


@router.get("/innovation/feature-requests")
def get_feature_requests_frontend(dataset_id: int = Query(...), db: Session = Depends(get_db)):
    requests = db.query(FeatureRequest).filter(FeatureRequest.dataset_id == dataset_id).all()
    # If not yet extracted, auto-extract
    if not requests:
        reviews = (
            db.query(FactReview, DimProduct.product_name)
            .join(DimProduct, FactReview.product_sk == DimProduct.product_sk, isouter=True)
            .filter(FactReview.dataset_id == dataset_id)
            .limit(200)
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
        requests = db.query(FeatureRequest).filter(FeatureRequest.dataset_id == dataset_id).all()

    return [format_feature_request(r) for r in requests]


@router.post("/innovation/feature-requests/{feature_id}/confirm")
def confirm_feature_request(feature_id: int, db: Session = Depends(get_db)):
    fr = db.query(FeatureRequest).filter(FeatureRequest.id == feature_id).first()
    if not fr:
        raise HTTPException(status_code=404, detail="Feature request not found")
    fr.analyst_confirmed = True
    db.commit()
    return {"id": fr.id, "status": "confirmed"}


@router.post("/innovation/feature-requests/{feature_id}/reject")
def reject_feature_request(feature_id: int, db: Session = Depends(get_db)):
    fr = db.query(FeatureRequest).filter(FeatureRequest.id == feature_id).first()
    if not fr:
        raise HTTPException(status_code=404, detail="Feature request not found")
    fr.analyst_confirmed = False
    db.commit()
    return {"id": fr.id, "status": "rejected"}


@router.get("/innovation/feature-requests/themes")
def get_feature_themes(dataset_id: int = Query(...), db: Session = Depends(get_db)):
    requests = db.query(FeatureRequest).filter(FeatureRequest.dataset_id == dataset_id).all()
    themes_map = {}
    for r in requests:
        thm = r.theme or "General Improvements"
        if thm not in themes_map:
            themes_map[thm] = []
        themes_map[thm].append(r.raw_text)

    return [
        {
            "theme": thm,
            "mention_count": len(texts),
            "sample_texts": texts[:4]
        }
        for thm, texts in themes_map.items()
    ]


# Legacy Endpoints
@router.post("/datasets/{dataset_id}/features/extract")
def trigger_feature_extraction(dataset_id: int, db: Session = Depends(get_db)):
    db.query(FeatureRequest).filter(FeatureRequest.dataset_id == dataset_id).delete()
    return get_feature_requests_frontend(dataset_id, db)


@router.get("/datasets/{dataset_id}/features")
def get_features_legacy(dataset_id: int, db: Session = Depends(get_db)):
    return get_feature_requests_frontend(dataset_id, db)


@router.patch("/features/{feature_id}")
def update_feature_confirmation(feature_id: int, req: FeatureRequestUpdate, db: Session = Depends(get_db)):
    fr = db.query(FeatureRequest).filter(FeatureRequest.id == feature_id).first()
    if not fr:
        raise HTTPException(status_code=404, detail="Feature request not found")
    fr.analyst_confirmed = req.analyst_confirmed
    db.commit()
    return {"id": fr.id, "analyst_confirmed": fr.analyst_confirmed}
