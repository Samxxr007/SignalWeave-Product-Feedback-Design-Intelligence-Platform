from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.warehouse import FactReview, Dataset
from app.services.preprocessing.cleaner import clean_text
from app.services.preprocessing.nlp_pipeline import process_text

router = APIRouter(prefix="/datasets")


@router.post("/{dataset_id}/preprocess/clean")
def run_cleaning(dataset_id: int, db: Session = Depends(get_db)):
    reviews = db.query(FactReview).filter(FactReview.dataset_id == dataset_id).all()
    if not reviews:
        raise HTTPException(status_code=404, detail="No reviews found in warehouse for this dataset")

    cleaned_count = 0
    for r in reviews:
        res = clean_text(r.review_text_original or "")
        r.review_text_clean = res["cleaned"]
        cleaned_count += 1

    db.commit()
    return {"dataset_id": dataset_id, "cleaned_count": cleaned_count, "status": "completed"}


@router.post("/{dataset_id}/preprocess/nlp")
def run_nlp(dataset_id: int, sample_size: int = 50, db: Session = Depends(get_db)):
    reviews = db.query(FactReview).filter(FactReview.dataset_id == dataset_id).limit(sample_size).all()
    if not reviews:
        raise HTTPException(status_code=404, detail="No reviews found in warehouse for this dataset")

    processed = []
    for r in reviews:
        text = r.review_text_clean or r.review_text_original or ""
        nlp_res = process_text(text)
        processed.append({
            "fact_id": r.fact_id,
            "word_count": nlp_res["word_count"],
            "processed_word_count": nlp_res["processed_word_count"],
            "keywords": nlp_res["keywords"][:5],
            "operations": nlp_res["operations"]
        })

    return {
        "dataset_id": dataset_id,
        "sample_size": len(processed),
        "results": processed
    }


@router.get("/{dataset_id}/preprocess/sample")
def get_preprocess_sample(dataset_id: int, db: Session = Depends(get_db)):
    review = db.query(FactReview).filter(FactReview.dataset_id == dataset_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="No reviews found in warehouse for this dataset")

    text = review.review_text_original or ""
    clean_res = clean_text(text)
    nlp_res = process_text(clean_res["cleaned"])

    return {
        "fact_id": review.fact_id,
        "original_text": text,
        "cleaned_text": clean_res["cleaned"],
        "cleaning_operations": clean_res["operations"],
        "nlp_pipeline": {
            "tokens_sample": nlp_res["tokens"][:15],
            "tokens_filtered_sample": nlp_res["tokens_filtered"][:15],
            "lemmatized_sample": nlp_res["lemmatized"][:15],
            "keywords": nlp_res["keywords"]
        }
    }
