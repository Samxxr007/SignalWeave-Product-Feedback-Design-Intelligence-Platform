from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from sqlalchemy.orm import Session
from app.models.warehouse import FactReview

analyzer = SentimentIntensityAnalyzer()


def analyze_review(text: str) -> dict:
    scores = analyzer.polarity_scores(text)
    compound = scores['compound']
    if compound >= 0.05:
        label = 'positive'
    elif compound <= -0.05:
        label = 'negative'
    else:
        label = 'neutral'
    return {
        'compound': compound,
        'pos': scores['pos'],
        'neg': scores['neg'],
        'neu': scores['neu'],
        'label': label
    }


def run_on_dataset(db: Session, dataset_id: int) -> dict:
    reviews = db.query(FactReview).filter(FactReview.dataset_id == dataset_id).all()
    dist = {'positive': 0, 'negative': 0, 'neutral': 0}
    total_compound = 0.0

    for review in reviews:
        text = review.review_text_clean or review.review_text_original or ''
        result = analyze_review(text)
        review.sentiment_score = result['compound']
        review.sentiment_label = result['label']
        dist[result['label']] += 1
        total_compound += result['compound']

    db.commit()
    count = len(reviews)
    return {
        'processed': count,
        'distribution': dist,
        'avg_compound': round(total_compound / count, 4) if count > 0 else 0.0,
    }
