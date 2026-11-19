from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.warehouse import FactAspectSentiment, FactReview, AspectDictionary


def detect_emerging_complaints(db: Session, dataset_id: int, recent_days: int = 60, prior_days: int = 60) -> dict:
    """
    For each aspect, compare mentions in recent window vs prior window.
    Returns sorted by growth_rate descending.
    """
    today = date.today()
    recent_end = today
    recent_start = today - timedelta(days=recent_days)
    prior_end = recent_start
    prior_start = prior_end - timedelta(days=prior_days)

    # Get all active aspects for this dataset
    aspects = (
        db.query(FactAspectSentiment.aspect_name)
        .filter(FactAspectSentiment.dataset_id == dataset_id)
        .distinct()
        .all()
    )

    results = []
    for (aspect_name,) in aspects:
        recent_count = (
            db.query(func.count(FactAspectSentiment.aspect_id))
            .join(FactReview, FactAspectSentiment.fact_id == FactReview.fact_id)
            .filter(
                FactAspectSentiment.dataset_id == dataset_id,
                FactAspectSentiment.aspect_name == aspect_name,
                FactAspectSentiment.aspect_label == 'negative',
                FactReview.review_date >= recent_start,
                FactReview.review_date <= recent_end,
            )
            .scalar() or 0
        )
        prior_count = (
            db.query(func.count(FactAspectSentiment.aspect_id))
            .join(FactReview, FactAspectSentiment.fact_id == FactReview.fact_id)
            .filter(
                FactAspectSentiment.dataset_id == dataset_id,
                FactAspectSentiment.aspect_name == aspect_name,
                FactAspectSentiment.aspect_label == 'negative',
                FactReview.review_date >= prior_start,
                FactReview.review_date < prior_end,
            )
            .scalar() or 0
        )

        # Classify data quality
        if prior_count == 0 and recent_count > 0:
            data_quality = 'newly_appearing'
            growth_rate = float('inf')
            trend_label = 'emerging'
        elif prior_count < 5:
            data_quality = 'insufficient_prior_data'
            growth_rate = 0.0
            trend_label = 'unknown'
        elif recent_count < 3:
            data_quality = 'insufficient_recent_data'
            growth_rate = 0.0
            trend_label = 'unknown'
        else:
            data_quality = 'sufficient'
            growth_rate = (recent_count - prior_count) / prior_count
            if growth_rate > 0.5:
                trend_label = 'emerging'
            elif growth_rate > 0.1:
                trend_label = 'rising'
            elif growth_rate < -0.2:
                trend_label = 'declining'
            else:
                trend_label = 'stable'

        # Sample reviews
        sample_reviews = (
            db.query(FactReview.review_text_original, FactReview.review_date)
            .join(FactAspectSentiment, FactAspectSentiment.fact_id == FactReview.fact_id)
            .filter(
                FactAspectSentiment.dataset_id == dataset_id,
                FactAspectSentiment.aspect_name == aspect_name,
                FactAspectSentiment.aspect_label == 'negative',
                FactReview.review_date >= recent_start,
            )
            .limit(3)
            .all()
        )

        results.append({
            'aspect_name': aspect_name,
            'recent_count': recent_count,
            'prior_count': prior_count,
            'growth_rate': growth_rate if growth_rate != float('inf') else 999.0,
            'trend_label': trend_label,
            'data_quality': data_quality,
            'sample_reviews': [
                {'text': r.review_text_original[:200] if r.review_text_original else '', 'date': str(r.review_date)}
                for r in sample_reviews
            ],
            'comparison_period': {
                'recent_start': str(recent_start),
                'recent_end': str(recent_end),
                'prior_start': str(prior_start),
                'prior_end': str(prior_end),
            }
        })

    # Sort by growth_rate descending, put sufficient data first
    results.sort(key=lambda x: (x['data_quality'] == 'sufficient', x['growth_rate']), reverse=True)

    return {
        'results': results,
        'comparison_period': {
            'recent': {'start': str(recent_start), 'end': str(recent_end), 'days': recent_days},
            'prior': {'start': str(prior_start), 'end': str(prior_end), 'days': prior_days}
        },
        'dataset_id': dataset_id
    }
