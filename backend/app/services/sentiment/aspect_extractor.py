from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import re
from sqlalchemy.orm import Session
from app.models.warehouse import FactAspectSentiment, AspectDictionary

analyzer = SentimentIntensityAnalyzer()


def extract_aspects(review_text: str, fact_id: int, dataset_id: int, aspect_dict: list) -> list:
    """
    Split review into sentences.
    For each sentence, check if any aspect keyword is present.
    If found, run VADER on that sentence.
    Return list of FactAspectSentiment-compatible dicts.
    """
    sentences = re.split(r'[.!?]+', review_text)
    results = []
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) < 5:
            continue
        sentence_lower = sentence.lower()
        for aspect in aspect_dict:
            if not aspect.get('is_active', True):
                continue
            keywords = aspect.get('keywords', [])
            if any(kw in sentence_lower for kw in keywords):
                score = analyzer.polarity_scores(sentence)['compound']
                label = 'positive' if score >= 0.05 else ('negative' if score <= -0.05 else 'neutral')
                results.append({
                    'fact_id': fact_id,
                    'dataset_id': dataset_id,
                    'aspect_name': aspect['aspect_name'],
                    'aspect_score': score,
                    'aspect_label': label,
                    'evidence_text': sentence
                })
                break  # one aspect per sentence
    return results


def run_aspect_extraction(db: Session, dataset_id: int) -> dict:
    """Run aspect extraction on all fact reviews for the dataset."""
    from app.models.warehouse import FactReview
    
    # Load aspect dictionary
    aspects = db.query(AspectDictionary).filter(AspectDictionary.is_active == True).all()
    aspect_dict = [{'aspect_name': a.aspect_name, 'keywords': a.keywords, 'is_active': a.is_active} for a in aspects]
    
    reviews = db.query(FactReview).filter(FactReview.dataset_id == dataset_id).all()
    
    total_extracted = 0
    for review in reviews:
        text = review.review_text_clean or review.review_text_original or ''
        extracted = extract_aspects(text, review.fact_id, dataset_id, aspect_dict)
        for asp in extracted:
            db.add(FactAspectSentiment(**asp))
            total_extracted += 1
    
    db.commit()
    return {
        'reviews_processed': len(reviews),
        'aspects_extracted': total_extracted,
        'dataset_id': dataset_id
    }
