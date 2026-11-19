import os
import sys
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import Base
from app.models.warehouse import (
    Dataset, StagingReview, DimProduct, DimCategory, DimDate,
    DimSource, DimCustomer, FactReview, FactAspectSentiment,
    AspectDictionary, MiningRun, Recommendation, RoadmapScenario
)
from app.models.feature_requests import FeatureRequest, EffortEstimate

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def test_db():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
