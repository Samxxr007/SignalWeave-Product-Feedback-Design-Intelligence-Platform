from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import (
    ingestion,
    preprocessing,
    analytics,
    mining,
    innovation_pain_index,
    innovation_emerging,
    innovation_features,
    innovation_opportunities,
    innovation_recommendations,
    innovation_roadmap,
)

app = FastAPI(
    title="SignalWeave API",
    description="Product Feedback & Design Intelligence Platform API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ingestion & Datasets
app.include_router(ingestion.router, prefix="/api/v1", tags=["Ingestion"])
app.include_router(preprocessing.router, prefix="/api/v1", tags=["Preprocessing"])
app.include_router(analytics.router, prefix="/api/v1", tags=["Analytics / OLAP"])
app.include_router(mining.router, prefix="/api/v1", tags=["Data Mining"])

# Innovation Engine
app.include_router(innovation_pain_index.router, prefix="/api/v1", tags=["Pain Index"])
app.include_router(innovation_emerging.router, prefix="/api/v1", tags=["Emerging Complaints"])
app.include_router(innovation_features.router, prefix="/api/v1", tags=["Feature Requests"])
app.include_router(innovation_opportunities.router, prefix="/api/v1", tags=["Opportunities"])
app.include_router(innovation_recommendations.router, prefix="/api/v1", tags=["Recommendations"])
app.include_router(innovation_roadmap.router, prefix="/api/v1", tags=["Roadmap Simulator"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "SignalWeave API"}
