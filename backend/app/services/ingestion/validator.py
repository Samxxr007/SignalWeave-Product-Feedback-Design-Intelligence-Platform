import hashlib
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import re


@dataclass
class ValidationResult:
    passed_count: int = 0
    failed_count: int = 0
    warnings: List[str] = field(default_factory=list)
    rejected_rows: List[Dict[str, Any]] = field(default_factory=list)
    valid_rows: List[Dict[str, Any]] = field(default_factory=list)


DATE_FORMATS = [
    '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%m-%d-%Y',
    '%Y/%m/%d', '%B %d, %Y', '%b %d, %Y', '%d %B %Y', '%d %b %Y',
    '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d %H:%M:%S',
]


def parse_date(value: Any) -> Optional[date]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, (datetime,)):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    # Try pandas
    try:
        return pd.to_datetime(s).date()
    except Exception:
        return None


def parse_rating(value: Any) -> Optional[float]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        r = float(str(value).strip())
        # Detect 1-10 scale and convert
        if r > 5.0:
            r = r / 2.0
        return round(r, 1)
    except (ValueError, TypeError):
        return None


def compute_hash(review_text: str, product_name: str) -> str:
    text = (str(review_text)[:200] + str(product_name)).encode('utf-8')
    return hashlib.sha256(text).hexdigest()


def validate_dataframe(
    df: pd.DataFrame,
    dataset_id: int,
    existing_hashes: set = None,
) -> ValidationResult:
    """
    Validate each row of the mapped DataFrame.
    Returns ValidationResult with passed/failed counts and row details.
    """
    if existing_hashes is None:
        existing_hashes = set()

    result = ValidationResult()
    seen_hashes = set()

    for idx, row in df.iterrows():
        errors = []
        warnings_row = []

        # review_text: required, min 10 chars
        review_text = row.get('review_text', None)
        if pd.isna(review_text) if isinstance(review_text, float) else review_text is None:
            errors.append("review_text is missing")
        elif str(review_text).strip() == '':
            errors.append("review_text is empty")
        elif len(str(review_text).strip()) < 10:
            errors.append(f"review_text too short ({len(str(review_text).strip())} chars, min 10)")

        # rating: required, 1.0-5.0
        raw_rating = row.get('rating', None)
        rating = parse_rating(raw_rating)
        if rating is None:
            errors.append("rating is missing or invalid")
        elif not (1.0 <= rating <= 5.0):
            errors.append(f"rating out of range: {rating} (must be 1.0-5.0)")

        # product_name: required
        product_name = row.get('product_name', None)
        if pd.isna(product_name) if isinstance(product_name, float) else product_name is None:
            errors.append("product_name is missing")
        elif str(product_name).strip() == '':
            errors.append("product_name is empty")

        # review_date: required, parseable
        raw_date = row.get('review_date', None)
        review_date = parse_date(raw_date)
        if review_date is None:
            errors.append(f"review_date is missing or unparseable: {raw_date}")

        # Duplicate detection
        if not errors and review_text and product_name:
            h = compute_hash(str(review_text), str(product_name))
            if h in existing_hashes or h in seen_hashes:
                errors.append("Duplicate record (hash match)")
            else:
                seen_hashes.add(h)

        row_dict = {
            'index': int(idx),
            'review_text': str(review_text) if review_text is not None else None,
            'rating': rating,
            'product_name': str(product_name) if product_name is not None else None,
            'product_id': str(row.get('product_id', '')) if pd.notna(row.get('product_id', None)) else None,
            'category': str(row.get('category', '')) if pd.notna(row.get('category', None)) else None,
            'review_date': review_date,
            'source': str(row.get('source', 'Unknown')) if pd.notna(row.get('source', None)) else 'Unknown',
            'review_id': str(row.get('review_id', '')) if pd.notna(row.get('review_id', None)) else None,
            'customer_id': str(row.get('customer_id', '')) if pd.notna(row.get('customer_id', None)) else None,
            'record_hash': compute_hash(str(review_text or ''), str(product_name or '')),
        }

        if errors:
            result.failed_count += 1
            result.rejected_rows.append({**row_dict, 'validation_errors': errors})
        else:
            result.passed_count += 1
            result.valid_rows.append({**row_dict, 'validation_errors': []})

    return result
