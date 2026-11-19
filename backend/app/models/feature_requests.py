from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey
from app.core.database import Base


class FeatureRequest(Base):
    __tablename__ = "feature_requests"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), index=True)
    theme = Column(String(255))
    raw_text = Column(Text)
    product_id = Column(String(255))
    product_name = Column(String(500))
    review_id = Column(Integer, ForeignKey("fact_reviews.fact_id"), nullable=True)
    confidence_score = Column(Float)
    extracted_at = Column(DateTime, default=datetime.utcnow)
    analyst_confirmed = Column(Boolean, nullable=True)  # None=pending, True=confirmed, False=rejected
    pattern_matched = Column(String(255))


class EffortEstimate(Base):
    __tablename__ = "effort_estimates"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), index=True)
    aspect_name = Column(String(100))
    effort_score = Column(Float)  # 1-10
    updated_at = Column(DateTime, default=datetime.utcnow)
