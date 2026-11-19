from datetime import datetime, timedelta, date
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.warehouse import FactAspectSentiment, FactReview, AspectDictionary


def calculate_pain_index(db: Session, dataset_id: int, aspect_name: str, weights: dict = None) -> dict:
    """
    weights default: {neg_pct: 0.35, freq: 0.25, recency: 0.25, rating_impact: 0.15}
    All factors normalized 0-100 before weighting.
    Returns: {score, breakdown: {factor: {raw, normalized, weight, contribution}}, 
              review_count, calculation_timestamp}
    """
    w = weights or {'neg_pct': 0.35, 'freq': 0.25, 'recency': 0.25, 'rating_impact': 0.15}

    # All mentions for this aspect in this dataset
    all_mentions = (
        db.query(FactAspectSentiment)
        .filter(FactAspectSentiment.dataset_id == dataset_id,
                FactAspectSentiment.aspect_name == aspect_name)
        .all()
    )
    total_count = len(all_mentions)

    if total_count == 0:
        return {
            'score': 0.0,
            'aspect_name': aspect_name,
            'review_count': 0,
            'breakdown': {},
            'calculation_timestamp': datetime.utcnow().isoformat(),
        }

    # --- Factor 1: Negative percentage ---
    neg_count = sum(1 for m in all_mentions if m.aspect_label == 'negative')
    neg_pct_raw = (neg_count / total_count) * 100
    neg_pct_normalized = neg_pct_raw  # already 0-100

    # --- Factor 2: Frequency score (relative to max aspect mentions in dataset) ---
    max_mentions_row = (
        db.query(func.count(FactAspectSentiment.aspect_id))
        .filter(FactAspectSentiment.dataset_id == dataset_id)
        .group_by(FactAspectSentiment.aspect_name)
        .order_by(func.count(FactAspectSentiment.aspect_id).desc())
        .first()
    )
    max_mentions = max_mentions_row[0] if max_mentions_row else 1
    freq_raw = total_count
    freq_normalized = min((total_count / max_mentions) * 100, 100)

    # --- Factor 3: Recency growth (last 90 days vs prior 90 days) ---
    today = date.today()
    recent_start = today - timedelta(days=90)
    prior_start = today - timedelta(days=180)
    prior_end = recent_start

    recent_neg = (
        db.query(func.count(FactAspectSentiment.aspect_id))
        .join(FactReview, FactAspectSentiment.fact_id == FactReview.fact_id)
        .filter(FactAspectSentiment.dataset_id == dataset_id,
                FactAspectSentiment.aspect_name == aspect_name,
                FactAspectSentiment.aspect_label == 'negative',
                FactReview.review_date >= recent_start)
        .scalar() or 0
    )
    prior_neg = (
        db.query(func.count(FactAspectSentiment.aspect_id))
        .join(FactReview, FactAspectSentiment.fact_id == FactReview.fact_id)
        .filter(FactAspectSentiment.dataset_id == dataset_id,
                FactAspectSentiment.aspect_name == aspect_name,
                FactAspectSentiment.aspect_label == 'negative',
                FactReview.review_date >= prior_start,
                FactReview.review_date < prior_end)
        .scalar() or 0
    )

    if prior_neg == 0 and recent_neg > 0:
        recency_normalized = 60.0
    elif prior_neg == 0 and recent_neg == 0:
        recency_normalized = 0.0
    else:
        growth = (recent_neg - prior_neg) / prior_neg
        recency_normalized = min(max(50 + growth * 50, 0), 100)
    recency_raw = recent_neg

    # --- Factor 4: Rating impact ---
    neg_reviews_ratings = (
        db.query(func.avg(FactReview.rating))
        .join(FactAspectSentiment, FactAspectSentiment.fact_id == FactReview.fact_id)
        .filter(FactAspectSentiment.dataset_id == dataset_id,
                FactAspectSentiment.aspect_name == aspect_name,
                FactAspectSentiment.aspect_label == 'negative')
        .scalar()
    )
    if neg_reviews_ratings is None:
        rating_impact_raw = 3.0
        rating_normalized = 0.0
    else:
        rating_impact_raw = float(neg_reviews_ratings)
        rating_normalized = max(0.0, min((3.0 - rating_impact_raw) / 2.0 * 100, 100))

    # --- Final score ---
    score = (
        neg_pct_normalized * w['neg_pct'] +
        freq_normalized * w['freq'] +
        recency_normalized * w['recency'] +
        rating_normalized * w['rating_impact']
    )

    return {
        'score': round(score, 2),
        'aspect_name': aspect_name,
        'review_count': total_count,
        'negative_count': neg_count,
        'breakdown': {
            'neg_pct': {
                'raw': round(neg_pct_raw, 2),
                'normalized': round(neg_pct_normalized, 2),
                'weight': w['neg_pct'],
                'contribution': round(neg_pct_normalized * w['neg_pct'], 2)
            },
            'freq': {
                'raw': freq_raw,
                'normalized': round(freq_normalized, 2),
                'weight': w['freq'],
                'contribution': round(freq_normalized * w['freq'], 2)
            },
            'recency': {
                'raw': recency_raw,
                'normalized': round(recency_normalized, 2),
                'weight': w['recency'],
                'contribution': round(recency_normalized * w['recency'], 2)
            },
            'rating_impact': {
                'raw': round(rating_impact_raw, 2),
                'normalized': round(rating_normalized, 2),
                'weight': w['rating_impact'],
                'contribution': round(rating_normalized * w['rating_impact'], 2)
            }
        },
        'calculation_timestamp': datetime.utcnow().isoformat()
    }
