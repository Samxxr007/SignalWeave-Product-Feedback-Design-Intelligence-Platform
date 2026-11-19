from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from app.models.warehouse import FactAspectSentiment, RoadmapScenario
from app.services.pain_index.calculator import calculate_pain_index
from datetime import datetime


def simulate_roadmap(db: Session, dataset_id: int, scenario_name: str, improvements: List[Dict[str, Any]]) -> dict:
    """
    improvements: [{aspect_name, priority, effort_estimate}]
    Returns:
    {
        scenario_name,
        is_estimate: True,
        disclaimer: "This is an estimated planning scenario, not a guaranteed business outcome.",
        reviews_addressed: sum of negative reviews for selected aspects,
        aspects_resolved: count,
        estimated_pain_reduction: sum of pain_index scores (labeled as estimate),
        improvements_detail: [{aspect, pain_index, negative_count, effort}]
    }
    """
    total_reviews_addressed = 0
    total_pain_reduction = 0.0
    improvements_detail = []

    for item in improvements:
        aspect_name = item.get('aspect_name')
        effort = item.get('effort_estimate', 5.0)
        priority = item.get('priority', 'medium')

        # Negative review count for this aspect
        neg_count = (
            db.query(func.count(FactAspectSentiment.aspect_id))
            .filter(
                FactAspectSentiment.dataset_id == dataset_id,
                FactAspectSentiment.aspect_name == aspect_name,
                FactAspectSentiment.aspect_label == 'negative'
            )
            .scalar() or 0
        )

        # Pain index
        pain_res = calculate_pain_index(db, dataset_id, aspect_name)
        pain_score = pain_res.get('score', 0.0)

        total_reviews_addressed += neg_count
        total_pain_reduction += pain_score

        improvements_detail.append({
            'aspect_name': aspect_name,
            'pain_index': pain_score,
            'negative_count': neg_count,
            'effort_estimate': effort,
            'priority': priority
        })

    scenario = RoadmapScenario(
        dataset_id=dataset_id,
        name=scenario_name,
        improvements=improvements_detail,
        total_reviews_addressed=total_reviews_addressed,
        estimated_pain_reduction=round(total_pain_reduction, 2),
        is_estimate=True,
        estimate_disclaimer="This is an estimated planning scenario, not a guaranteed business outcome.",
        created_at=datetime.utcnow()
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    return {
        'scenario_id': scenario.scenario_id,
        'scenario_name': scenario_name,
        'is_estimate': True,
        'disclaimer': "This is an estimated planning scenario, not a guaranteed business outcome.",
        'reviews_addressed': total_reviews_addressed,
        'aspects_resolved': len(improvements),
        'estimated_pain_reduction': round(total_pain_reduction, 2),
        'improvements_detail': improvements_detail,
        'created_at': scenario.created_at.isoformat()
    }
