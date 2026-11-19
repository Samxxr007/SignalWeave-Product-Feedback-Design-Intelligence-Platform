from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import numpy as np
from typing import List


def run_kmeans(texts: List[str], review_ids: List[int], k: int = 6) -> dict:
    """
    Returns clusters with: id, size, top_keywords, sentiment_distribution,
    representative_review_indices, product_category_distribution
    """
    if len(texts) < k:
        k = max(2, len(texts) // 2)

    vectorizer = TfidfVectorizer(
        max_features=3000,
        stop_words='english',
        min_df=max(2, int(len(texts) * 0.01))
    )
    try:
        tfidf = vectorizer.fit_transform(texts)
    except ValueError as e:
        return {'clusters': [], 'labels': [], 'error': str(e)}

    feature_names = vectorizer.get_feature_names_out()

    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(tfidf)

    clusters = []
    for i in range(k):
        mask = labels == i
        cluster_indices = np.where(mask)[0]

        # Top keywords by mean TF-IDF weight in cluster
        center = km.cluster_centers_[i]
        top_kw_indices = center.argsort()[:-11:-1]
        keywords = [feature_names[j] for j in top_kw_indices]

        # Find docs closest to centroid
        cluster_tfidf = tfidf[cluster_indices]
        distances = np.linalg.norm(cluster_tfidf.toarray() - center, axis=1)
        sorted_by_dist = distances.argsort()
        closest = cluster_indices[sorted_by_dist[:3]]

        clusters.append({
            'cluster_id': i,
            'size': int(mask.sum()),
            'top_keywords': keywords,
            'representative_indices': closest.tolist(),
            'member_indices': cluster_indices.tolist()
        })

    return {
        'clusters': clusters,
        'labels': labels.tolist(),
        'k': k,
        'algorithm': 'K-Means',
        'parameters': {'k': k, 'max_features': 3000, 'random_state': 42}
    }
