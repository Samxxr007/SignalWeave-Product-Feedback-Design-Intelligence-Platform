from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.models.warehouse import FactReview, FactAspectSentiment, AspectDictionary, MiningRun
from app.schemas.mining import TopicModellingRequest, ClusteringRequest, AssociationRequest
from app.services.sentiment.vader_analyzer import run_on_dataset
from app.services.sentiment.aspect_extractor import run_aspect_extraction
from app.services.topics.tfidf_nmf import run_topic_modelling
from app.services.clustering.kmeans_cluster import run_kmeans
from app.services.association.apriori_miner import run_apriori

router = APIRouter(prefix="/datasets")


@router.post("/{dataset_id}/sentiment/run")
def trigger_sentiment(dataset_id: int, db: Session = Depends(get_db)):
    result = run_on_dataset(db, dataset_id)
    return result


@router.get("/{dataset_id}/sentiment/distribution")
def get_sentiment_distribution(dataset_id: int, db: Session = Depends(get_db)):
    dist = (
        db.query(FactReview.sentiment_label, func.count(FactReview.fact_id))
        .filter(FactReview.dataset_id == dataset_id)
        .group_by(FactReview.sentiment_label)
        .all()
    )
    avg_score = (
        db.query(func.avg(FactReview.sentiment_score))
        .filter(FactReview.dataset_id == dataset_id)
        .scalar() or 0.0
    )
    return {
        "dataset_id": dataset_id,
        "distribution": {label: count for label, count in dist if label},
        "average_compound": round(float(avg_score), 4)
    }


@router.post("/{dataset_id}/aspects/extract")
def trigger_aspect_extraction(dataset_id: int, db: Session = Depends(get_db)):
    # Clear existing aspect extractions for this dataset first
    db.query(FactAspectSentiment).filter(FactAspectSentiment.dataset_id == dataset_id).delete()
    result = run_aspect_extraction(db, dataset_id)
    return result


@router.get("/{dataset_id}/aspects")
def get_aspect_breakdown(dataset_id: int, db: Session = Depends(get_db)):
    aspects = (
        db.query(
            FactAspectSentiment.aspect_name,
            func.count(FactAspectSentiment.aspect_id).label('total'),
            func.sum(
                case((FactAspectSentiment.aspect_label == 'positive', 1), else_=0)
            ).label('positive'),
            func.sum(
                case((FactAspectSentiment.aspect_label == 'negative', 1), else_=0)
            ).label('negative'),
            func.sum(
                case((FactAspectSentiment.aspect_label == 'neutral', 1), else_=0)
            ).label('neutral'),
            func.avg(FactAspectSentiment.aspect_score).label('avg_score')
        )
        .filter(FactAspectSentiment.dataset_id == dataset_id)
        .group_by(FactAspectSentiment.aspect_name)
        .all()
    )
    return [
        {
            "aspect_name": a.aspect_name,
            "total_mentions": a.total,
            "positive_count": a.positive or 0,
            "negative_count": a.negative or 0,
            "neutral_count": a.neutral or 0,
            "avg_sentiment": round(float(a.avg_score or 0.0), 3)
        }
        for a in aspects
    ]


@router.post("/{dataset_id}/topics/run")
def trigger_topic_modelling(dataset_id: int, req: TopicModellingRequest, db: Session = Depends(get_db)):
    reviews = db.query(FactReview).filter(FactReview.dataset_id == dataset_id).all()
    texts = [r.review_text_clean or r.review_text_original or "" for r in reviews]
    
    res = run_topic_modelling(texts, n_components=req.n_components or 5, n_top_words=req.n_top_words or 10)
    
    # Save run
    run = MiningRun(
        dataset_id=dataset_id,
        algorithm="TF-IDF + NMF",
        parameters=req.model_dump(),
        results=res,
        records_processed=len(texts),
        status="completed"
    )
    db.add(run)
    db.commit()
    return res


@router.get("/{dataset_id}/topics/latest")
def get_latest_topics(dataset_id: int, db: Session = Depends(get_db)):
    run = (
        db.query(MiningRun)
        .filter(MiningRun.dataset_id == dataset_id, MiningRun.algorithm == "TF-IDF + NMF")
        .order_by(MiningRun.run_id.desc())
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="No topic modelling run found for this dataset")
    return run.results


@router.post("/{dataset_id}/clustering/run")
def trigger_clustering(dataset_id: int, req: ClusteringRequest, db: Session = Depends(get_db)):
    reviews = db.query(FactReview).filter(FactReview.dataset_id == dataset_id).all()
    texts = [r.review_text_clean or r.review_text_original or "" for r in reviews]
    review_ids = [r.fact_id for r in reviews]
    
    res = run_kmeans(texts, review_ids, k=req.k or 5)
    
    run = MiningRun(
        dataset_id=dataset_id,
        algorithm="K-Means",
        parameters=req.model_dump(),
        results=res,
        records_processed=len(texts),
        status="completed"
    )
    db.add(run)
    db.commit()
    return res


@router.get("/{dataset_id}/clustering/latest")
def get_latest_clustering(dataset_id: int, db: Session = Depends(get_db)):
    run = (
        db.query(MiningRun)
        .filter(MiningRun.dataset_id == dataset_id, MiningRun.algorithm == "K-Means")
        .order_by(MiningRun.run_id.desc())
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="No clustering run found for this dataset")
    return run.results


@router.post("/{dataset_id}/association/run")
def trigger_association(dataset_id: int, req: AssociationRequest, db: Session = Depends(get_db)):
    # Group aspects by review
    rows = (
        db.query(FactAspectSentiment.fact_id, FactAspectSentiment.aspect_name)
        .filter(FactAspectSentiment.dataset_id == dataset_id)
        .all()
    )
    
    baskets_dict = {}
    for fact_id, aspect in rows:
        if fact_id not in baskets_dict:
            baskets_dict[fact_id] = set()
        baskets_dict[fact_id].add(aspect)
    
    aspect_baskets = list(baskets_dict.values())
    res = run_apriori(aspect_baskets, min_support=req.min_support or 0.05, min_confidence=req.min_confidence or 0.3)
    
    run = MiningRun(
        dataset_id=dataset_id,
        algorithm="Apriori",
        parameters=req.model_dump(),
        results=res,
        records_processed=len(aspect_baskets),
        status="completed"
    )
    db.add(run)
    db.commit()
    return res


@router.get("/{dataset_id}/association/latest")
def get_latest_association(dataset_id: int, db: Session = Depends(get_db)):
    run = (
        db.query(MiningRun)
        .filter(MiningRun.dataset_id == dataset_id, MiningRun.algorithm == "Apriori")
        .order_by(MiningRun.run_id.desc())
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="No association mining run found for this dataset")
    return run.results
