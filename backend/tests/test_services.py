import pytest
import pandas as pd
from datetime import date, timedelta
from app.services.ingestion.file_parser import parse_file
from app.services.ingestion.validator import validate_dataframe
from app.services.sentiment.vader_analyzer import analyze_review
from app.services.clustering.kmeans_cluster import run_kmeans
from app.services.association.apriori_miner import run_apriori
from app.services.pain_index.calculator import calculate_pain_index
from app.services.emerging.detector import detect_emerging_complaints
from app.models.warehouse import FactAspectSentiment, FactReview, DimProduct, DimCategory, DimDate, DimSource, Dataset


def test_file_parser_csv():
    csv_bytes = b"review_text,rating,product_name,review_date\nGreat phone,5.0,PhoneX,2023-01-01\n"
    df, cols, err = parse_file(csv_bytes, "test.csv")
    assert err is None
    assert df is not None
    assert len(df) == 1
    assert "review_text" in cols


def test_validator_catches_invalid_rows():
    df = pd.DataFrame([
        {"review_text": "Good", "rating": 5.0, "product_name": "Phone", "review_date": "2023-01-01"},  # too short (<10 chars)
        {"review_text": None, "rating": 5.0, "product_name": "Phone", "review_date": "2023-01-01"},    # missing
        {"review_text": "This is a great product with awesome battery life.", "rating": 4.5, "product_name": "Phone", "review_date": "2023-01-01"}  # valid
    ])
    res = validate_dataframe(df, dataset_id=1)
    assert res.passed_count == 1
    assert res.failed_count == 2


def test_vader_sentiment_classification():
    pos = analyze_review("Absolutely fantastic, I love this incredible phone! Amazing quality.")
    assert pos["label"] == "positive"
    assert pos["compound"] > 0.05

    neg = analyze_review("Terrible, horrible product. Completely broken and unusable disaster.")
    assert neg["label"] == "negative"
    assert neg["compound"] < -0.05


def test_kmeans_returns_exact_k():
    texts = [
        "battery life is terrible and dies fast",
        "battery drains quickly and charge is bad",
        "display screen is gorgeous and crisp",
        "screen colors are vivid and high resolution",
        "audio sound has too much static noise",
        "sound crackles and speakers are distorted",
        "fast shipping and great customer support",
        "helpful customer service and quick refund",
        "lightweight design and comfortable fit",
        "ergonomic design and fits well in hand"
    ]
    ids = list(range(len(texts)))
    res = run_kmeans(texts, ids, k=3)
    assert len(res["clusters"]) == 3
    assert len(res["labels"]) == len(texts)


def test_apriori_computes_rules():
    # Basket sets
    baskets = [
        {"battery", "performance"},
        {"battery", "performance"},
        {"battery", "performance", "display"},
        {"battery", "sound_quality"},
        {"battery", "performance"},
        {"performance", "display"},
        {"battery", "performance"},
        {"battery", "performance", "display"},
        {"battery", "sound_quality"},
        {"battery", "performance"},
        {"sound_quality", "comfort"},
        {"sound_quality", "comfort"},
    ]
    res = run_apriori(baskets, min_support=0.2, min_confidence=0.5)
    assert "rules" in res
    assert res["rule_count"] > 0
    # verify rule fields exist and are not hardcoded
    rule = res["rules"][0]
    assert "antecedents" in rule
    assert "consequents" in rule
    assert "lift" in rule


def test_pain_index_empty_and_zero_division(test_db):
    res = calculate_pain_index(test_db, dataset_id=999, aspect_name="battery")
    assert res["score"] == 0.0
    assert res["review_count"] == 0


def test_emerging_detector_insufficient_prior_data(test_db):
    # Setup dataset
    ds = Dataset(id=1, name="Test", status="loaded")
    test_db.add(ds)
    test_db.commit()

    # Add 1 negative aspect mention in recent period (less than 5 in prior)
    today = date.today()
    fact = FactReview(fact_id=1, dataset_id=1, rating=1.0, review_date=today - timedelta(days=5), review_text_original="Battery is terrible")
    test_db.add(fact)
    test_db.commit()

    asp = FactAspectSentiment(fact_id=1, dataset_id=1, aspect_name="battery", aspect_score=-0.8, aspect_label="negative")
    test_db.add(asp)
    test_db.commit()

    res = detect_emerging_complaints(test_db, dataset_id=1, recent_days=30, prior_days=30)
    assert len(res["results"]) > 0
    item = [r for r in res["results"] if r["aspect_name"] == "battery"][0]
    assert item["data_quality"] in ("newly_appearing", "insufficient_prior_data")
