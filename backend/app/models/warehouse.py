from datetime import datetime, date
from typing import Optional
from sqlalchemy import (Column, Integer, String, Float, Boolean, DateTime, Date,
                        Text, JSON, ForeignKey, Index, UniqueConstraint)
from sqlalchemy.orm import relationship
from app.core.database import Base


class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    file_type = Column(String(10))
    file_path = Column(String(500))
    total_records = Column(Integer, default=0)
    staged_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    rejected_records = Column(Integer, default=0)
    warehouse_records = Column(Integer, default=0)
    status = Column(String(50), default="uploaded")  # uploaded/staged/validated/loaded
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    column_mapping = Column(JSON)
    is_sample = Column(Boolean, default=False)
    staging_reviews = relationship("StagingReview", back_populates="dataset")
    fact_reviews = relationship("FactReview", back_populates="dataset")


class StagingReview(Base):
    __tablename__ = "staging_reviews"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False, index=True)
    raw_data = Column(JSON)
    review_id_original = Column(String(255))
    product_id = Column(String(255))
    product_name = Column(String(500))
    category = Column(String(255))
    review_text = Column(Text)
    rating = Column(Float)
    review_date = Column(Date)
    source = Column(String(255))
    customer_id = Column(String(255))
    status = Column(String(50), default="staged")  # staged/valid/rejected/loaded
    validation_errors = Column(JSON)
    record_hash = Column(String(64), index=True)
    dataset = relationship("Dataset", back_populates="staging_reviews")


class DimProduct(Base):
    __tablename__ = "dim_product"
    product_sk = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(255), unique=True, index=True)
    product_name = Column(String(500))
    brand = Column(String(255))
    __table_args__ = (Index("ix_dim_product_name", "product_name"),)


class DimCategory(Base):
    __tablename__ = "dim_category"
    category_sk = Column(Integer, primary_key=True, index=True)
    category_name = Column(String(255), unique=True, index=True)
    parent_category = Column(String(255))


class DimDate(Base):
    __tablename__ = "dim_date"
    date_sk = Column(Integer, primary_key=True, index=True)
    full_date = Column(Date, unique=True, index=True)
    year = Column(Integer, index=True)
    quarter = Column(Integer)
    month = Column(Integer, index=True)
    month_name = Column(String(20))
    week = Column(Integer)
    day_of_week = Column(Integer)


class DimSource(Base):
    __tablename__ = "dim_source"
    source_sk = Column(Integer, primary_key=True, index=True)
    source_name = Column(String(255), unique=True, index=True)
    source_type = Column(String(100))


class DimCustomer(Base):
    __tablename__ = "dim_customer"
    customer_sk = Column(Integer, primary_key=True, index=True)
    customer_hash = Column(String(64), unique=True, index=True)
    anonymised_id = Column(String(50))


class FactReview(Base):
    __tablename__ = "fact_reviews"
    fact_id = Column(Integer, primary_key=True, index=True)
    product_sk = Column(Integer, ForeignKey("dim_product.product_sk"), index=True)
    category_sk = Column(Integer, ForeignKey("dim_category.category_sk"), index=True)
    date_sk = Column(Integer, ForeignKey("dim_date.date_sk"), index=True)
    source_sk = Column(Integer, ForeignKey("dim_source.source_sk"), index=True)
    customer_sk = Column(Integer, ForeignKey("dim_customer.customer_sk"), nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), index=True)
    staging_id = Column(Integer, ForeignKey("staging_reviews.id"), nullable=True)
    review_id_original = Column(String(255))
    rating = Column(Float)
    sentiment_score = Column(Float, nullable=True)
    sentiment_label = Column(String(20), nullable=True)
    helpful_votes = Column(Integer, default=0)
    review_text_clean = Column(Text, nullable=True)
    review_text_original = Column(Text)
    review_date = Column(Date)
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    product = relationship("DimProduct")
    category = relationship("DimCategory")
    date_dim = relationship("DimDate")
    source = relationship("DimSource")
    dataset = relationship("Dataset", back_populates="fact_reviews")
    aspect_sentiments = relationship("FactAspectSentiment", back_populates="review")
    __table_args__ = (
        Index("ix_fact_review_date", "review_date"),
        Index("ix_fact_review_product_date", "product_sk", "review_date"),
    )


class FactAspectSentiment(Base):
    __tablename__ = "fact_aspect_sentiment"
    aspect_id = Column(Integer, primary_key=True, index=True)
    fact_id = Column(Integer, ForeignKey("fact_reviews.fact_id"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), index=True)
    aspect_name = Column(String(100), index=True)
    aspect_score = Column(Float)
    aspect_label = Column(String(20))
    evidence_text = Column(Text)
    review = relationship("FactReview", back_populates="aspect_sentiments")


class AspectDictionary(Base):
    __tablename__ = "aspect_dictionary"
    id = Column(Integer, primary_key=True, index=True)
    aspect_name = Column(String(100), unique=True, index=True)
    keywords = Column(JSON)
    category = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class MiningRun(Base):
    __tablename__ = "mining_runs"
    run_id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), index=True)
    algorithm = Column(String(100))
    parameters = Column(JSON)
    results = Column(JSON)
    executed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="pending")
    records_processed = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)


class Recommendation(Base):
    __tablename__ = "recommendations"
    rec_id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), index=True)
    product_id = Column(String(255))
    product_name = Column(String(500))
    aspect_name = Column(String(100))
    pain_index = Column(Float)
    negative_count = Column(Integer)
    total_count = Column(Integer)
    evidence_reviews = Column(JSON)
    suggested_improvement = Column(Text)
    generated_at = Column(DateTime, default=datetime.utcnow)
    trend_direction = Column(String(20))
    priority = Column(String(20))
    pain_index_breakdown = Column(JSON)


class RoadmapScenario(Base):
    __tablename__ = "roadmap_scenarios"
    scenario_id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), index=True)
    name = Column(String(255))
    improvements = Column(JSON)
    total_reviews_addressed = Column(Integer)
    estimated_pain_reduction = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_estimate = Column(Boolean, default=True)
    estimate_disclaimer = Column(
        String(500),
        default="This is an estimated planning scenario, not a guaranteed business outcome."
    )
