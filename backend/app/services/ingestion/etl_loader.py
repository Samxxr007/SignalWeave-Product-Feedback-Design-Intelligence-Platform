import hashlib
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List, Dict, Any, Optional
import calendar

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import select

from app.models.warehouse import (
    DimProduct, DimCategory, DimDate, DimSource, DimCustomer,
    FactReview, StagingReview, Dataset
)
from app.services.preprocessing.cleaner import clean_text
from app.services.sentiment.vader_analyzer import analyze_review


@dataclass
class ETLResult:
    loaded_count: int = 0
    skipped_count: int = 0
    errors: List[str] = field(default_factory=list)


def _upsert_product(db: Session, product_id: str, product_name: str) -> int:
    obj = db.query(DimProduct).filter(DimProduct.product_id == product_id).first()
    if not obj:
        obj = DimProduct(product_id=product_id, product_name=product_name)
        db.add(obj)
        db.flush()
    return obj.product_sk


def _upsert_category(db: Session, category_name: str) -> int:
    name = (category_name or 'Unknown').strip()
    obj = db.query(DimCategory).filter(DimCategory.category_name == name).first()
    if not obj:
        obj = DimCategory(category_name=name)
        db.add(obj)
        db.flush()
    return obj.category_sk


def _upsert_date(db: Session, d: date) -> int:
    obj = db.query(DimDate).filter(DimDate.full_date == d).first()
    if not obj:
        obj = DimDate(
            full_date=d,
            year=d.year,
            quarter=(d.month - 1) // 3 + 1,
            month=d.month,
            month_name=calendar.month_name[d.month],
            week=d.isocalendar()[1],
            day_of_week=d.weekday(),
        )
        db.add(obj)
        db.flush()
    return obj.date_sk


def _upsert_source(db: Session, source_name: str) -> int:
    name = (source_name or 'Unknown').strip()
    obj = db.query(DimSource).filter(DimSource.source_name == name).first()
    if not obj:
        source_type = 'e-commerce' if name.lower() in ('amazon', 'best buy') else 'review_site'
        obj = DimSource(source_name=name, source_type=source_type)
        db.add(obj)
        db.flush()
    return obj.source_sk


def _upsert_customer(db: Session, customer_id: Optional[str]) -> Optional[int]:
    raw = str(customer_id) if customer_id else 'anon'
    h = hashlib.sha256(raw.encode()).hexdigest()
    obj = db.query(DimCustomer).filter(DimCustomer.customer_hash == h).first()
    if not obj:
        obj = DimCustomer(customer_hash=h, anonymised_id=f"CUST_{h[:8]}")
        db.add(obj)
        db.flush()
    return obj.customer_sk


def run_etl(db: Session, dataset_id: int) -> ETLResult:
    result = ETLResult()
    staging_rows = (
        db.query(StagingReview)
        .filter(
            StagingReview.dataset_id == dataset_id,
            StagingReview.status == 'valid',
        )
        .all()
    )

    for row in staging_rows:
        try:
            pid = row.product_id or f"PROD_{hashlib.md5(str(row.product_name).encode()).hexdigest()[:8]}"
            product_sk = _upsert_product(db, pid, row.product_name or 'Unknown')
            category_sk = _upsert_category(db, row.category or 'Unknown')
            if not row.review_date:
                result.skipped_count += 1
                continue
            date_sk = _upsert_date(db, row.review_date)
            source_sk = _upsert_source(db, row.source or 'Unknown')
            customer_sk = _upsert_customer(db, row.customer_id)

            # Clean text
            clean_result = clean_text(row.review_text or '')
            cleaned = clean_result['cleaned']

            # Sentiment
            sentiment = analyze_review(row.review_text or '')

            fact = FactReview(
                product_sk=product_sk,
                category_sk=category_sk,
                date_sk=date_sk,
                source_sk=source_sk,
                customer_sk=customer_sk,
                dataset_id=dataset_id,
                staging_id=row.id,
                review_id_original=row.review_id_original,
                rating=row.rating,
                sentiment_score=sentiment['compound'],
                sentiment_label=sentiment['label'],
                review_text_clean=cleaned,
                review_text_original=row.review_text,
                review_date=row.review_date,
                is_synthetic=False,
                helpful_votes=0,
            )
            db.add(fact)
            # Mark staging row as loaded
            row.status = 'loaded'
            result.loaded_count += 1

        except Exception as e:
            result.errors.append(f"Row {row.id}: {str(e)}")
            result.skipped_count += 1

    # Update dataset warehouse_records count
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if dataset:
        dataset.warehouse_records = result.loaded_count
        dataset.status = 'loaded'

    db.commit()
    return result
