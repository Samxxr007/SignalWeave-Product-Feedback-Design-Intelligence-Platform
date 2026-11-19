from mlxtend.frequent_patterns import apriori, association_rules
import pandas as pd
from typing import List, Set


def run_apriori(aspect_baskets: List[Set[str]], min_support: float = 0.05, min_confidence: float = 0.3) -> dict:
    """
    aspect_baskets: list of sets of aspect_names per review
    Returns: {rules: [{antecedents, consequents, support, confidence, lift}], 
              frequent_itemsets, algorithm, parameters}
    NEVER hardcode — always compute from actual data.
    """
    all_aspects = set()
    for basket in aspect_baskets:
        all_aspects.update(basket)

    if not all_aspects:
        return {
            'rules': [],
            'frequent_itemsets': [],
            'rule_count': 0,
            'algorithm': 'Apriori',
            'parameters': {'min_support': min_support, 'min_confidence': min_confidence},
            'error': 'No aspects found in baskets'
        }

    # Build binary matrix
    basket_data = []
    for basket in aspect_baskets:
        row = {aspect: (aspect in basket) for aspect in all_aspects}
        basket_data.append(row)

    df = pd.DataFrame(basket_data)
    if df.empty or df.shape[0] < 10:
        return {
            'rules': [],
            'frequent_itemsets': [],
            'rule_count': 0,
            'algorithm': 'Apriori',
            'parameters': {'min_support': min_support, 'min_confidence': min_confidence},
            'error': 'Insufficient data for association mining (minimum 10 reviews)'
        }

    frequent_items = apriori(df, min_support=min_support, use_colnames=True)
    if frequent_items.empty:
        return {
            'rules': [],
            'frequent_itemsets': [],
            'rule_count': 0,
            'algorithm': 'Apriori',
            'parameters': {'min_support': min_support, 'min_confidence': min_confidence},
            'note': 'No frequent itemsets at this support threshold'
        }

    rules = association_rules(frequent_items, metric="confidence", min_threshold=min_confidence, num_itemsets=len(frequent_items))

    rules_list = []
    for _, row in rules.iterrows():
        rules_list.append({
            'antecedents': list(row['antecedents']),
            'consequents': list(row['consequents']),
            'support': round(float(row['support']), 4),
            'confidence': round(float(row['confidence']), 4),
            'lift': round(float(row['lift']), 4)
        })
    rules_list.sort(key=lambda x: x['lift'], reverse=True)

    # Frequent itemsets summary
    fi_summary = []
    for _, row in frequent_items.iterrows():
        fi_summary.append({
            'itemsets': list(row['itemsets']),
            'support': round(float(row['support']), 4)
        })

    return {
        'rules': rules_list,
        'rule_count': len(rules_list),
        'frequent_itemsets': fi_summary,
        'algorithm': 'Apriori',
        'parameters': {'min_support': min_support, 'min_confidence': min_confidence}
    }
