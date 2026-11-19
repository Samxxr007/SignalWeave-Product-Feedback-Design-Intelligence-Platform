from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class TopicModellingRequest(BaseModel):
    n_components: Optional[int] = 5
    n_top_words: Optional[int] = 10


class ClusteringRequest(BaseModel):
    k: Optional[int] = 5


class AssociationRequest(BaseModel):
    min_support: Optional[float] = 0.05
    min_confidence: Optional[float] = 0.3
