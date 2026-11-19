from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.models.warehouse import FactReview, DimProduct, DimCategory, DimDate, DimSource
from app.schemas.analytics import RollupRequest, DrilldownRequest, SliceRequest, DiceRequest, PivotRequest
from app.services.olap.aggregator import rollup, drilldown, slice_op, dice_op, pivot_op

router = APIRouter(prefix="/datasets")


@router.get("/{dataset_id}/overview")
def get_dataset_overview(dataset_id: int, db: Session = Depends(get_db)):
    total_reviews = db.query(func.count(FactReview.fact_id)).filter(FactReview.dataset_id == dataset_id).scalar() or 0
    avg_rating = db.query(func.avg(FactReview.rating)).filter(FactReview.dataset_id == dataset_id).scalar() or 0.0
    avg_sentiment = db.query(func.avg(FactReview.sentiment_score)).filter(FactReview.dataset_id == dataset_id).scalar() or 0.0

    # Rating distribution
    rating_dist = (
        db.query(FactReview.rating, func.count(FactReview.fact_id))
        .filter(FactReview.dataset_id == dataset_id)
        .group_by(FactReview.rating)
        .order_by(FactReview.rating.asc())
        .all()
    )

    # Categories breakdown
    categories = (
        db.query(DimCategory.category_name, func.count(FactReview.fact_id), func.avg(FactReview.rating))
        .join(FactReview, FactReview.category_sk == DimCategory.category_sk)
        .filter(FactReview.dataset_id == dataset_id)
        .group_by(DimCategory.category_name)
        .all()
    )

    # Products count
    products_count = (
        db.query(func.count(func.distinct(FactReview.product_sk)))
        .filter(FactReview.dataset_id == dataset_id)
        .scalar() or 0
    )

    return {
        "dataset_id": dataset_id,
        "total_reviews": total_reviews,
        "avg_rating": round(float(avg_rating), 2),
        "avg_sentiment": round(float(avg_sentiment), 3),
        "products_count": products_count,
        "rating_distribution": [{"rating": r[0], "count": r[1]} for r in rating_dist],
        "categories": [
            {"category": c[0], "count": c[1], "avg_rating": round(float(c[2]), 2)}
            for c in categories
        ]
    }


@router.get("/{dataset_id}/filters")
def get_filter_options(dataset_id: int, db: Session = Depends(get_db)):
    categories = (
        db.query(DimCategory.category_name)
        .join(FactReview, FactReview.category_sk == DimCategory.category_sk)
        .filter(FactReview.dataset_id == dataset_id)
        .distinct()
        .all()
    )
    products = (
        db.query(DimProduct.product_id, DimProduct.product_name)
        .join(FactReview, FactReview.product_sk == DimProduct.product_sk)
        .filter(FactReview.dataset_id == dataset_id)
        .distinct()
        .all()
    )
    sources = (
        db.query(DimSource.source_name)
        .join(FactReview, FactReview.source_sk == DimSource.source_sk)
        .filter(FactReview.dataset_id == dataset_id)
        .distinct()
        .all()
    )
    years = (
        db.query(DimDate.year)
        .join(FactReview, FactReview.date_sk == DimDate.date_sk)
        .filter(FactReview.dataset_id == dataset_id)
        .distinct()
        .all()
    )

    return {
        "categories": [c[0] for c in categories if c[0]],
        "products": [{"id": p[0], "name": p[1]} for p in products if p[0]],
        "sources": [s[0] for s in sources if s[0]],
        "years": sorted([y[0] for y in years if y[0]])
    }


@router.post("/{dataset_id}/olap/rollup")
def olap_rollup(dataset_id: int, req: RollupRequest, db: Session = Depends(get_db)):
    return rollup(db, dataset_id, req.dimensions, req.measure, req.filters)


@router.post("/{dataset_id}/olap/drilldown")
def olap_drilldown(dataset_id: int, req: DrilldownRequest, db: Session = Depends(get_db)):
    return drilldown(db, dataset_id, req.dimension, req.value, req.child_dimension, req.filters)


@router.post("/{dataset_id}/olap/slice")
def olap_slice(dataset_id: int, req: SliceRequest, db: Session = Depends(get_db)):
    return slice_op(db, dataset_id, req.dimension, req.value, req.other_dimensions, req.measure)


@router.post("/{dataset_id}/olap/dice")
def olap_dice(dataset_id: int, req: DiceRequest, db: Session = Depends(get_db)):
    return dice_op(db, dataset_id, req.filters, req.dimensions, req.measure)


@router.post("/{dataset_id}/olap/pivot")
def olap_pivot(dataset_id: int, req: PivotRequest, db: Session = Depends(get_db)):
    return pivot_op(db, dataset_id, req.row_dim, req.col_dim, req.measure, req.filters)
