import pandas as pd
from typing import Dict, List, Tuple, Optional
import re

# Standard internal column names
INTERNAL_COLUMNS = [
    'review_text', 'rating', 'product_name', 'product_id',
    'category', 'review_date', 'source', 'review_id', 'customer_id'
]

# Fuzzy mapping keywords for each internal column
COLUMN_PATTERNS = {
    'review_text': ['review_text', 'reviewtext', 'review', 'comment', 'feedback', 'text', 'body', 'description', 'review_body'],
    'rating': ['rating', 'score', 'stars', 'rate', 'overall', 'overall_rating', 'star_rating'],
    'product_name': ['product_name', 'productname', 'product', 'item_name', 'item', 'name', 'title', 'product_title'],
    'product_id': ['product_id', 'productid', 'asin', 'sku', 'item_id', 'pid'],
    'category': ['category', 'cat', 'department', 'type', 'product_category', 'product_type'],
    'review_date': ['review_date', 'date', 'created_at', 'reviewdate', 'timestamp', 'review_time', 'posted_date', 'submission_date'],
    'source': ['source', 'platform', 'channel', 'origin', 'website', 'marketplace'],
    'review_id': ['review_id', 'reviewid', 'id', 'review_number', 'rid'],
    'customer_id': ['customer_id', 'customerid', 'user_id', 'userid', 'reviewer_id', 'author_id', 'user'],
}


def auto_map_columns(detected_columns: List[str]) -> Dict[str, str]:
    """
    Auto-detect mapping from detected column names to internal schema.
    Returns {internal_name: detected_column_name}
    """
    mapping = {}
    detected_lower = {c.lower().replace(' ', '_').replace('-', '_'): c for c in detected_columns}

    for internal, patterns in COLUMN_PATTERNS.items():
        for pattern in patterns:
            if pattern in detected_lower:
                mapping[internal] = detected_lower[pattern]
                break
        # Fuzzy match if not found
        if internal not in mapping:
            for pattern in patterns:
                for col_lower, col_orig in detected_lower.items():
                    if pattern in col_lower or col_lower in pattern:
                        mapping[internal] = col_orig
                        break
                if internal in mapping:
                    break

    return mapping


def apply_mapping(df: pd.DataFrame, column_mapping: Dict[str, str]) -> pd.DataFrame:
    """
    Apply column mapping to DataFrame, returning only mapped columns with internal names.
    """
    rename_map = {v: k for k, v in column_mapping.items() if v in df.columns}
    df_mapped = df.rename(columns=rename_map)

    # Keep only internal columns that exist
    cols_to_keep = [c for c in INTERNAL_COLUMNS if c in df_mapped.columns]
    df_result = df_mapped[cols_to_keep].copy()

    return df_result
