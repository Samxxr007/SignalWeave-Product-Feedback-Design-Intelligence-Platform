from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional, List, Dict
from app.models.warehouse import FactReview, DimProduct, DimCategory, DimDate, DimSource


def rollup(db: Session, dataset_id: int, dimensions: list, measure: str, filters: dict = None):
    """Group by dimensions and aggregate measure."""
    # Build dynamic groupby
    dim_map = {
        'category': DimCategory.category_name,
        'product': DimProduct.product_name,
        'year': DimDate.year,
        'month': DimDate.month,
        'quarter': DimDate.quarter,
        'source': DimSource.source_name,
    }
    
    measure_map = {
        'avg_rating': func.avg(FactReview.rating),
        'count': func.count(FactReview.fact_id),
        'avg_sentiment': func.avg(FactReview.sentiment_score),
    }
    
    agg_func = measure_map.get(measure, func.count(FactReview.fact_id))
    
    q = db.query(FactReview).filter(FactReview.dataset_id == dataset_id)
    q = q.join(DimProduct, FactReview.product_sk == DimProduct.product_sk, isouter=True)
    q = q.join(DimCategory, FactReview.category_sk == DimCategory.category_sk, isouter=True)
    q = q.join(DimDate, FactReview.date_sk == DimDate.date_sk, isouter=True)
    q = q.join(DimSource, FactReview.source_sk == DimSource.source_sk, isouter=True)
    
    if filters:
        for key, val in filters.items():
            if key == 'category' and val:
                q = q.filter(DimCategory.category_name == val)
            elif key == 'year' and val:
                q = q.filter(DimDate.year == val)
    
    group_cols = []
    select_cols = []
    for dim in dimensions:
        if dim in dim_map:
            col = dim_map[dim]
            group_cols.append(col)
            select_cols.append(col)
    
    result_q = db.query(*select_cols, agg_func.label(measure)).filter(FactReview.dataset_id == dataset_id)
    result_q = result_q.join(DimProduct, FactReview.product_sk == DimProduct.product_sk, isouter=True)
    result_q = result_q.join(DimCategory, FactReview.category_sk == DimCategory.category_sk, isouter=True)
    result_q = result_q.join(DimDate, FactReview.date_sk == DimDate.date_sk, isouter=True)
    result_q = result_q.join(DimSource, FactReview.source_sk == DimSource.source_sk, isouter=True)
    
    if filters:
        for key, val in filters.items():
            if key == 'category' and val:
                result_q = result_q.filter(DimCategory.category_name == val)
            elif key == 'year' and val:
                result_q = result_q.filter(DimDate.year == int(val))
    
    if group_cols:
        result_q = result_q.group_by(*group_cols)
    
    rows = result_q.all()
    output = []
    for row in rows:
        item = {}
        for i, dim in enumerate(dimensions):
            if dim in dim_map:
                item[dim] = row[i]
        item[measure] = round(float(row[-1]), 4) if row[-1] is not None else None
        output.append(item)
    
    return {'dimensions': dimensions, 'measure': measure, 'data': output}


def drilldown(db: Session, dataset_id: int, dimension: str, value: str, child_dimension: str, filters: dict = None):
    """Drill from dimension value to child."""
    return rollup(db, dataset_id, [child_dimension], 'avg_rating', {dimension: value})


def slice_op(db: Session, dataset_id: int, dimension: str, value: str, other_dimensions: list, measure: str):
    """Fix one dimension, analyze others."""
    return rollup(db, dataset_id, other_dimensions, measure, {dimension: value})


def dice_op(db: Session, dataset_id: int, filters: dict, dimensions: list, measure: str):
    """Multi-dimension filter cube."""
    return rollup(db, dataset_id, dimensions, measure, filters)


def pivot_op(db: Session, dataset_id: int, row_dim: str, col_dim: str, measure: str, filters: dict = None):
    """2D pivot table."""
    data = rollup(db, dataset_id, [row_dim, col_dim], measure, filters)
    rows_data = data['data']
    
    # Build pivot structure
    row_values = list({r[row_dim] for r in rows_data})
    col_values = list({r[col_dim] for r in rows_data})
    
    pivot = {}
    for r in rows_data:
        rv = r[row_dim]
        cv = r[col_dim]
        if rv not in pivot:
            pivot[rv] = {}
        pivot[rv][cv] = r[measure]
    
    return {
        'row_dimension': row_dim,
        'col_dimension': col_dim,
        'measure': measure,
        'rows': row_values,
        'columns': col_values,
        'data': pivot
    }
