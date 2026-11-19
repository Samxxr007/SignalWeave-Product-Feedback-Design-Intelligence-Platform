from sqlalchemy.orm import Session
from sqlalchemy import func, case, Integer
from typing import List, Dict, Any
from app.models.warehouse import (
    FactAspectSentiment, FactReview, DimProduct, Recommendation
)
from app.services.pain_index.calculator import calculate_pain_index
from app.services.emerging.detector import detect_emerging_complaints
from datetime import datetime


def generate_recommendations(db: Session, dataset_id: int) -> List[Dict[str, Any]]:
    """
    Rule-based, fully traceable recommendations.
    Rule 1: IF pain_index > 65 AND trend == 'emerging' → priority='critical'
    Rule 2: IF pain_index > 50 AND negative_count > 20 → priority='high'
    Rule 3: IF aspect mentioned in >30% of reviews for product → priority='medium'
    """
    # Clear old recommendations for this dataset
    db.query(Recommendation).filter(Recommendation.dataset_id == dataset_id).delete()

    # Get all aspect-product combinations
    aspect_product_rows = (
        db.query(
            FactAspectSentiment.aspect_name,
            DimProduct.product_id,
            DimProduct.product_name,
            func.count(FactAspectSentiment.aspect_id).label('total'),
            func.sum(
                case((FactAspectSentiment.aspect_label == 'negative', 1), else_=0)
            ).label('neg_count')
        )
        .join(FactReview, FactAspectSentiment.fact_id == FactReview.fact_id)
        .join(DimProduct, FactReview.product_sk == DimProduct.product_sk)
        .filter(FactAspectSentiment.dataset_id == dataset_id)
        .group_by(FactAspectSentiment.aspect_name, DimProduct.product_id, DimProduct.product_name)
        .all()
    )

    # Get emerging complaints data
    emerging_data = detect_emerging_complaints(db, dataset_id)
    emerging_aspects = {
        r['aspect_name']: r['trend_label']
        for r in emerging_data['results']
        if r['trend_label'] in ('emerging', 'rising')
    }

    # Total reviews per product
    product_review_counts = {}
    for row in db.query(DimProduct.product_id, func.count(FactReview.fact_id)).join(
        FactReview, FactReview.product_sk == DimProduct.product_sk
    ).filter(FactReview.dataset_id == dataset_id).group_by(DimProduct.product_id).all():
        product_review_counts[row[0]] = row[1]

    recommendations = []
    for row in aspect_product_rows:
        aspect_name = row.aspect_name
        product_id = row.product_id
        product_name = row.product_name
        total = row.total or 0
        neg_count = row.neg_count or 0

        if total == 0:
            continue

        # Pain index (dataset-wide for this aspect)
        pain_data = calculate_pain_index(db, dataset_id, aspect_name)
        pain_score = pain_data['score']
        trend = emerging_aspects.get(aspect_name, 'stable')

        # Priority rules
        if pain_score > 65 and trend == 'emerging':
            priority = 'critical'
        elif pain_score > 50 and neg_count > 20:
            priority = 'high'
        else:
            product_total = product_review_counts.get(product_id, 1)
            mention_pct = total / product_total
            if mention_pct > 0.3 and neg_count > 5:
                priority = 'medium'
            else:
                priority = 'low'

        if priority == 'low':
            continue

        # Evidence reviews (up to 5, most negative)
        evidence_rows = (
            db.query(FactReview)
            .join(FactAspectSentiment, FactAspectSentiment.fact_id == FactReview.fact_id)
            .join(DimProduct, FactReview.product_sk == DimProduct.product_sk)
            .filter(
                FactAspectSentiment.dataset_id == dataset_id,
                FactAspectSentiment.aspect_name == aspect_name,
                FactAspectSentiment.aspect_label == 'negative',
                DimProduct.product_id == product_id,
            )
            .order_by(FactReview.sentiment_score.asc())
            .limit(5)
            .all()
        )

        evidence_reviews = [
            {
                'text': (r.review_text_original or '')[:300],
                'rating': r.rating,
                'date': str(r.review_date),
                'sentiment': r.sentiment_label,
            }
            for r in evidence_rows
        ]

        sample_text = evidence_reviews[0]['text'][:100] if evidence_reviews else 'customer feedback'
        suggested = (
            f"Improve {aspect_name} for {product_name} — {neg_count} customers report issues. "
            f"Sample feedback: '{sample_text}...'"
        )

        rec = Recommendation(
            dataset_id=dataset_id,
            product_id=product_id,
            product_name=product_name,
            aspect_name=aspect_name,
            pain_index=pain_score,
            negative_count=neg_count,
            total_count=total,
            evidence_reviews=evidence_reviews,
            suggested_improvement=suggested,
            trend_direction=trend,
            priority=priority,
            pain_index_breakdown=pain_data.get('breakdown', {}),
            generated_at=datetime.utcnow(),
        )
        db.add(rec)
        recommendations.append({
            'product_id': product_id,
            'product_name': product_name,
            'aspect_name': aspect_name,
            'pain_index': pain_score,
            'priority': priority,
            'negative_count': neg_count,
            'trend': trend,
        })

    db.commit()
    return recommendations
