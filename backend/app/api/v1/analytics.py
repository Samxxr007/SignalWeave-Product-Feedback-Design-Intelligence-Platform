from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.models.warehouse import FactReview, DimProduct, DimCategory, DimDate, DimSource, FactAspectSentiment
from app.schemas.analytics import RollupRequest, DrilldownRequest, SliceRequest, DiceRequest, PivotRequest
from app.services.olap.aggregator import rollup, drilldown, slice_op, dice_op, pivot_op

router = APIRouter()


# ============================================================
# Frontend Analytics Endpoints (/api/v1/analytics/...)
# ============================================================

@router.get("/analytics/summary")
def get_analytics_summary(dataset_id: int = Query(...), db: Session = Depends(get_db)):
    total_reviews = db.query(func.count(FactReview.fact_id)).filter(FactReview.dataset_id == dataset_id).scalar() or 0
    if total_reviews == 0:
        return {
            "dataset_id": dataset_id,
            "total_reviews": 0,
            "avg_rating": 0.0,
            "negative_pct": 0.0,
            "positive_pct": 0.0,
            "neutral_pct": 0.0,
            "date_range": {"from": "2023-01-01", "to": "2024-12-31"},
            "top_products": [],
            "top_categories": []
        }

    avg_rating = db.query(func.avg(FactReview.rating)).filter(FactReview.dataset_id == dataset_id).scalar() or 0.0

    # Sentiment percentages
    pos_count = db.query(func.count(FactReview.fact_id)).filter(
        FactReview.dataset_id == dataset_id, FactReview.sentiment_label == "positive"
    ).scalar() or 0
    neg_count = db.query(func.count(FactReview.fact_id)).filter(
        FactReview.dataset_id == dataset_id, FactReview.sentiment_label == "negative"
    ).scalar() or 0
    neu_count = db.query(func.count(FactReview.fact_id)).filter(
        FactReview.dataset_id == dataset_id, FactReview.sentiment_label == "neutral"
    ).scalar() or 0

    # Date range
    min_date = db.query(func.min(FactReview.review_date)).filter(FactReview.dataset_id == dataset_id).scalar()
    max_date = db.query(func.max(FactReview.review_date)).filter(FactReview.dataset_id == dataset_id).scalar()

    # Top products
    top_prods = (
        db.query(DimProduct.product_name, func.count(FactReview.fact_id), func.avg(FactReview.rating))
        .join(FactReview, FactReview.product_sk == DimProduct.product_sk)
        .filter(FactReview.dataset_id == dataset_id)
        .group_by(DimProduct.product_name)
        .order_by(func.count(FactReview.fact_id).desc())
        .limit(5)
        .all()
    )

    # Top categories
    top_cats = (
        db.query(DimCategory.category_name, func.count(FactReview.fact_id))
        .join(FactReview, FactReview.category_sk == DimCategory.category_sk)
        .filter(FactReview.dataset_id == dataset_id)
        .group_by(DimCategory.category_name)
        .order_by(func.count(FactReview.fact_id).desc())
        .all()
    )

    return {
        "dataset_id": dataset_id,
        "total_reviews": total_reviews,
        "avg_rating": round(float(avg_rating), 2),
        "negative_pct": round((neg_count / total_reviews) * 100, 1),
        "positive_pct": round((pos_count / total_reviews) * 100, 1),
        "neutral_pct": round((neu_count / total_reviews) * 100, 1),
        "date_range": {
            "from": str(min_date) if min_date else "2023-01-01",
            "to": str(max_date) if max_date else "2024-12-31"
        },
        "top_products": [
            {"product": p[0], "count": p[1], "avg_rating": round(float(p[2] or 0), 2)}
            for p in top_prods
        ],
        "top_categories": [
            {"category": c[0], "count": c[1]}
            for c in top_cats
        ]
    }


@router.get("/analytics/olap")
def get_olap_query(
    dataset_id: int = Query(...),
    dimension: str = Query("category"),
    measure: str = Query("avg_rating"),
    filter_value: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(FactReview).filter(FactReview.dataset_id == dataset_id)

    if dimension == "category":
        results = (
            db.query(
                DimCategory.category_name.label("name"),
                func.count(FactReview.fact_id).label("count"),
                func.avg(FactReview.rating).label("avg_rating"),
                func.sum(case((FactReview.sentiment_label == "negative", 1), else_=0)).label("neg_count")
            )
            .join(DimCategory, FactReview.category_sk == DimCategory.category_sk)
            .filter(FactReview.dataset_id == dataset_id)
            .group_by(DimCategory.category_name)
            .all()
        )
    elif dimension == "product":
        q = (
            db.query(
                DimProduct.product_name.label("name"),
                func.count(FactReview.fact_id).label("count"),
                func.avg(FactReview.rating).label("avg_rating"),
                func.sum(case((FactReview.sentiment_label == "negative", 1), else_=0)).label("neg_count")
            )
            .join(DimProduct, FactReview.product_sk == DimProduct.product_sk)
            .filter(FactReview.dataset_id == dataset_id)
        )
        if filter_value:
            q = q.join(DimCategory, FactReview.category_sk == DimCategory.category_sk).filter(DimCategory.category_name == filter_value)
        results = q.group_by(DimProduct.product_name).all()
    elif dimension == "source":
        results = (
            db.query(
                DimSource.source_name.label("name"),
                func.count(FactReview.fact_id).label("count"),
                func.avg(FactReview.rating).label("avg_rating"),
                func.sum(case((FactReview.sentiment_label == "negative", 1), else_=0)).label("neg_count")
            )
            .join(DimSource, FactReview.source_sk == DimSource.source_sk)
            .filter(FactReview.dataset_id == dataset_id)
            .group_by(DimSource.source_name)
            .all()
        )
    elif dimension == "sentiment":
        results = (
            db.query(
                FactReview.sentiment_label.label("name"),
                func.count(FactReview.fact_id).label("count"),
                func.avg(FactReview.rating).label("avg_rating"),
                func.sum(case((FactReview.sentiment_label == "negative", 1), else_=0)).label("neg_count")
            )
            .filter(FactReview.dataset_id == dataset_id)
            .group_by(FactReview.sentiment_label)
            .all()
        )
    else:  # period / default
        results = (
            db.query(
                DimDate.month_name.label("name"),
                func.count(FactReview.fact_id).label("count"),
                func.avg(FactReview.rating).label("avg_rating"),
                func.sum(case((FactReview.sentiment_label == "negative", 1), else_=0)).label("neg_count")
            )
            .join(DimDate, FactReview.date_sk == DimDate.date_sk)
            .filter(FactReview.dataset_id == dataset_id)
            .group_by(DimDate.month_name)
            .all()
        )

    formatted_data = []
    for r in results:
        count = r[1] or 0
        avg_r = round(float(r[2] or 0), 2)
        neg_c = r[3] or 0
        neg_p = round((neg_c / count) * 100, 1) if count > 0 else 0.0

        val = avg_r if measure == "avg_rating" else (count if measure == "review_count" else neg_p)
        formatted_data.append({
            "name": r[0] or "Unknown",
            "value": val,
            "count": count,
            "neg_pct": neg_p,
            "avg_rating": avg_r
        })

    return {
        "dimensions": [dimension],
        "measures": [measure],
        "data": formatted_data,
        "breadcrumb": ["All", dimension] + ([filter_value] if filter_value else [])
    }


@router.get("/analytics/trends")
def get_analytics_trends(
    dataset_id: int = Query(...),
    period: str = Query("monthly"),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = (
        db.query(
            DimDate.year,
            DimDate.month,
            DimDate.month_name,
            func.avg(FactReview.rating),
            func.count(FactReview.fact_id),
            func.avg(FactReview.sentiment_score)
        )
        .join(DimDate, FactReview.date_sk == DimDate.date_sk)
        .filter(FactReview.dataset_id == dataset_id)
    )

    if category:
        q = q.join(DimCategory, FactReview.category_sk == DimCategory.category_sk).filter(DimCategory.category_name == category)

    q = q.group_by(DimDate.year, DimDate.month, DimDate.month_name).order_by(DimDate.year.asc(), DimDate.month.asc())
    rows = q.all()

    trends = [
        {
            "period": f"{r[2][:3]} {r[0]}",
            "avg_rating": round(float(r[3] or 0), 2),
            "review_count": r[4] or 0,
            "sentiment_score": round(float(r[5] or 0), 3)
        }
        for r in rows
    ]

    return trends


@router.get("/analytics/product-matrix")
def get_product_matrix(dataset_id: int = Query(...), db: Session = Depends(get_db)):
    rows = (
        db.query(
            DimProduct.product_name,
            func.avg(FactReview.rating),
            func.count(FactReview.fact_id),
            func.avg(FactReview.sentiment_score),
            func.sum(case((FactReview.sentiment_label == "negative", 1), else_=0))
        )
        .join(DimProduct, FactReview.product_sk == DimProduct.product_sk)
        .filter(FactReview.dataset_id == dataset_id)
        .group_by(DimProduct.product_name)
        .order_by(func.count(FactReview.fact_id).desc())
        .all()
    )

    matrix = []
    for r in rows:
        cnt = r[2] or 0
        neg_cnt = r[4] or 0
        neg_p = round((neg_cnt / cnt) * 100, 1) if cnt > 0 else 0.0
        matrix.append({
            "product": r[0] or "Unknown",
            "avg_rating": round(float(r[1] or 0), 2),
            "review_count": cnt,
            "sentiment_score": round(float(r[3] or 0), 3),
            "negative_pct": neg_p
        })

    return matrix


@router.get("/analytics/sentiment-distribution")
def get_sentiment_distribution(
    dataset_id: int = Query(...),
    group_by: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    dist = (
        db.query(FactReview.sentiment_label, func.count(FactReview.fact_id))
        .filter(FactReview.dataset_id == dataset_id)
        .group_by(FactReview.sentiment_label)
        .all()
    )
    dist_map = {r[0]: r[1] for r in dist if r[0]}

    return {
        "positive": dist_map.get("positive", 0),
        "negative": dist_map.get("negative", 0),
        "neutral": dist_map.get("neutral", 0)
    }


# ============================================================
# Legacy Endpoints (/api/v1/datasets/{id}/overview & olap)
# ============================================================

@router.get("/datasets/{dataset_id}/overview")
def get_dataset_overview(dataset_id: int, db: Session = Depends(get_db)):
    return get_analytics_summary(dataset_id, db)


@router.get("/datasets/{dataset_id}/filters")
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


@router.post("/datasets/{dataset_id}/olap/rollup")
def olap_rollup(dataset_id: int, req: RollupRequest, db: Session = Depends(get_db)):
    return rollup(db, dataset_id, req.dimensions, req.measure, req.filters)


@router.post("/datasets/{dataset_id}/olap/drilldown")
def olap_drilldown(dataset_id: int, req: DrilldownRequest, db: Session = Depends(get_db)):
    return drilldown(db, dataset_id, req.dimension, req.value, req.child_dimension, req.filters)


@router.post("/datasets/{dataset_id}/olap/slice")
def olap_slice(dataset_id: int, req: SliceRequest, db: Session = Depends(get_db)):
    return slice_op(db, dataset_id, req.dimension, req.value, req.other_dimensions, req.measure)


@router.post("/datasets/{dataset_id}/olap/dice")
def olap_dice(dataset_id: int, req: DiceRequest, db: Session = Depends(get_db)):
    return dice_op(db, dataset_id, req.filters, req.dimensions, req.measure)


@router.post("/datasets/{dataset_id}/olap/pivot")
def olap_pivot(dataset_id: int, req: PivotRequest, db: Session = Depends(get_db)):
    return pivot_op(db, dataset_id, req.row_dim, req.col_dim, req.measure, req.filters)
