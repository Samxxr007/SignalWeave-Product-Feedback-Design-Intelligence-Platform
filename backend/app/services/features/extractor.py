import re
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

REQUEST_PATTERNS = [
    r"i wish",
    r"would be better if",
    r"please add",
    r"needs better",
    r"hope they add",
    r"should have",
    r"would love",
    r"if only",
    r"missing feature",
    r"want them to",
    r"needs to have",
    r"needs a(?:\s)",
    r"would be nice",
    r"they need to add",
    r"why (don't|doesn't|isn't|aren't) they",
    r"really want",
    r"please (fix|improve|update)",
]

HIGH_CONF_PATTERNS = {r"i wish", r"please add", r"please (fix|improve|update)"}


def extract_feature_requests(reviews: List[Dict[str, Any]], dataset_id: int) -> List[Dict[str, Any]]:
    """
    reviews: list of {fact_id, text, product_id, product_name}
    Returns list of FeatureRequest-compatible dicts.
    analyst_confirmed = None (pending — analyst must confirm before treating as validated)
    """
    requests = []
    for review in reviews:
        text = review.get('text', '')
        if not text:
            continue
        for pattern in REQUEST_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                confidence = 0.9 if pattern in HIGH_CONF_PATTERNS else 0.7
                # Extract the matching sentence
                sentences = re.split(r'[.!?]+', text)
                for sent in sentences:
                    if re.search(pattern, sent, re.IGNORECASE):
                        requests.append({
                            'dataset_id': dataset_id,
                            'raw_text': sent.strip(),
                            'product_id': review.get('product_id'),
                            'product_name': review.get('product_name'),
                            'review_id': review.get('fact_id'),
                            'confidence_score': confidence,
                            'pattern_matched': pattern,
                            'analyst_confirmed': None,  # pending — not auto-confirmed
                            'theme': None,  # filled by group_into_themes
                        })
                        break
                break
    return requests


def group_into_themes(requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Group similar requests using TF-IDF cosine similarity clustering."""
    if len(requests) < 2:
        for r in requests:
            r['theme'] = r['raw_text'][:50]
        return requests

    texts = [r['raw_text'] for r in requests]
    vectorizer = TfidfVectorizer(max_features=500, stop_words='english')
    try:
        tfidf = vectorizer.fit_transform(texts)
    except ValueError:
        for r in requests:
            r['theme'] = r['raw_text'][:50]
        return requests

    sim_matrix = cosine_similarity(tfidf)
    threshold = 0.4
    clusters = {}
    assigned = [-1] * len(requests)

    cluster_id = 0
    for i in range(len(requests)):
        if assigned[i] != -1:
            continue
        assigned[i] = cluster_id
        clusters[cluster_id] = [i]
        for j in range(i + 1, len(requests)):
            if assigned[j] == -1 and sim_matrix[i, j] >= threshold:
                assigned[j] = cluster_id
                clusters[cluster_id].append(j)
        cluster_id += 1

    # Assign theme label = most representative text
    for cid, indices in clusters.items():
        theme_text = requests[indices[0]]['raw_text'][:60]
        for idx in indices:
            requests[idx]['theme'] = theme_text

    return requests
