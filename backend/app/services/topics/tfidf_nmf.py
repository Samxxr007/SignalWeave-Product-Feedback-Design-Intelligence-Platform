from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import NMF
import numpy as np
from typing import List


def run_topic_modelling(texts: List[str], n_components: int = 10, n_top_words: int = 10) -> dict:
    """
    Returns: {
        topics: [{id, keywords, weight, representative_docs}],
        doc_topics: [topic_id per document],
        algorithm: 'TF-IDF + NMF',
        parameters: {n_components, n_top_words, max_features}
    }
    """
    if len(texts) < 5:
        return {
            'topics': [],
            'doc_topic_assignments': [],
            'algorithm': 'TF-IDF + NMF',
            'parameters': {'n_components': n_components, 'n_top_words': n_top_words, 'max_features': 5000},
            'error': 'Insufficient texts for topic modelling (minimum 5)'
        }

    n_components = min(n_components, len(texts) - 1)

    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        min_df=max(2, int(len(texts) * 0.01)),
        stop_words='english'
    )
    try:
        tfidf_matrix = vectorizer.fit_transform(texts)
    except ValueError as e:
        return {'topics': [], 'doc_topic_assignments': [], 'error': str(e)}

    feature_names = vectorizer.get_feature_names_out()

    nmf = NMF(n_components=n_components, random_state=42, max_iter=400)
    doc_topics = nmf.fit_transform(tfidf_matrix)

    topics = []
    for topic_idx, topic in enumerate(nmf.components_):
        top_indices = topic.argsort()[:-n_top_words - 1:-1]
        keywords = [feature_names[i] for i in top_indices]
        weights = [float(topic[i]) for i in top_indices]
        # Find representative docs
        doc_weights = doc_topics[:, topic_idx]
        top_doc_indices = doc_weights.argsort()[:-6:-1]
        topics.append({
            'id': topic_idx,
            'label': f"Topic {topic_idx + 1}",
            'keywords': keywords,
            'weights': weights,
            'representative_doc_indices': top_doc_indices.tolist(),
            'doc_count': int(np.sum(doc_topics.argmax(axis=1) == topic_idx))
        })

    return {
        'topics': topics,
        'doc_topic_assignments': doc_topics.argmax(axis=1).tolist(),
        'algorithm': 'TF-IDF + NMF',
        'parameters': {
            'n_components': n_components,
            'n_top_words': n_top_words,
            'max_features': 5000
        }
    }
