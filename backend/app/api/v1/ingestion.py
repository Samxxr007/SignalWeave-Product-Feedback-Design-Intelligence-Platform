import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.models.warehouse import Dataset, StagingReview, FactReview
from app.schemas.dataset import DatasetOut, ColumnMappingRequest, ValidationSummary
from app.services.ingestion.file_parser import parse_file
from app.services.ingestion.column_mapper import auto_map_columns, apply_mapping
from app.services.ingestion.validator import validate_dataframe
from app.services.ingestion.etl_loader import run_etl

router = APIRouter(prefix="/datasets")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    is_sample: Optional[bool] = Form(False),
    db: Session = Depends(get_db)
):
    dataset_name = name or file.filename or "Uploaded Dataset"
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "csv"
    
    file_bytes = await file.read()
    file_path = os.path.join(UPLOAD_DIR, f"{dataset_name}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    df, detected_columns, error = parse_file(file_bytes, file.filename)
    if error or df is None:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {error}")

    auto_mapping = auto_map_columns(detected_columns)

    dataset = Dataset(
        name=dataset_name,
        file_type=ext,
        file_path=file_path,
        total_records=len(df),
        status="uploaded",
        column_mapping=auto_mapping,
        is_sample=is_sample
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Automatically stage and validate if mapping covers minimal requirements
    mapped_df = apply_mapping(df, auto_mapping)
    validation_res = validate_dataframe(mapped_df, dataset.id)

    def clean_for_json(d: dict) -> dict:
        from datetime import date, datetime
        return {k: (v.isoformat() if isinstance(v, (date, datetime)) else v) for k, v in d.items()}

    # Insert into StagingReview
    for r in validation_res.valid_rows:
        staging_row = StagingReview(
            dataset_id=dataset.id,
            raw_data=clean_for_json(r),
            review_id_original=r.get('review_id'),
            product_id=r.get('product_id'),
            product_name=r.get('product_name'),
            category=r.get('category'),
            review_text=r.get('review_text'),
            rating=r.get('rating'),
            review_date=r.get('review_date'),
            source=r.get('source'),
            customer_id=r.get('customer_id'),
            status="valid",
            record_hash=r.get('record_hash')
        )
        db.add(staging_row)

    for r in validation_res.rejected_rows:
        staging_row = StagingReview(
            dataset_id=dataset.id,
            raw_data=clean_for_json(r),
            review_id_original=r.get('review_id'),
            product_id=r.get('product_id'),
            product_name=r.get('product_name'),
            category=r.get('category'),
            review_text=r.get('review_text'),
            rating=r.get('rating'),
            review_date=r.get('review_date'),
            source=r.get('source'),
            customer_id=r.get('customer_id'),
            status="rejected",
            validation_errors=r.get('validation_errors'),
            record_hash=r.get('record_hash')
        )
        db.add(staging_row)

    dataset.staged_records = len(df)
    dataset.valid_records = validation_res.passed_count
    dataset.rejected_records = validation_res.failed_count
    dataset.status = "validated"
    db.commit()
    db.refresh(dataset)

    return {
        "dataset_id": dataset.id,
        "name": dataset.name,
        "total_records": dataset.total_records,
        "valid_records": dataset.valid_records,
        "rejected_records": dataset.rejected_records,
        "detected_columns": detected_columns,
        "column_mapping": auto_mapping,
        "status": dataset.status
    }


@router.get("", response_model=List[DatasetOut])
@router.get("/", response_model=List[DatasetOut])
def list_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).order_by(Dataset.id.desc()).all()


@router.get("/{dataset_id}/preview")
def preview_dataset(dataset_id: int, limit: int = 50, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    staging = db.query(StagingReview).filter(StagingReview.dataset_id == dataset_id).limit(limit).all()
    rows = [s.raw_data or {
        "review_id": s.review_id_original,
        "product_name": s.product_name,
        "category": s.category,
        "review_text": s.review_text,
        "rating": s.rating,
        "review_date": str(s.review_date) if s.review_date else None,
        "source": s.source
    } for s in staging]

    columns = list(dataset.column_mapping.keys()) if dataset.column_mapping else (list(rows[0].keys()) if rows else [])
    return {
        "columns": columns,
        "rows": rows,
        "total": dataset.total_records or len(rows)
    }


@router.get("/{dataset_id}/stats")
def get_dataset_stats(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    staging = db.query(StagingReview).filter(StagingReview.dataset_id == dataset_id).limit(5).all()
    sample_rows = [s.raw_data or {"product": s.product_name, "rating": s.rating} for s in staging]
    columns = list(dataset.column_mapping.keys()) if dataset.column_mapping else []

    return {
        "total_records": dataset.total_records or 0,
        "columns": columns,
        "sample_rows": sample_rows,
        "dtypes": {col: "string" for col in columns},
        "missing_pct": {col: 0.0 for col in columns}
    }


@router.post("/{dataset_id}/load")
@router.post("/{dataset_id}/load-warehouse")
def load_to_warehouse(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    result = run_etl(db, dataset_id)
    return {
        "dataset_id": dataset_id,
        "loaded_count": result.loaded_count,
        "skipped_count": result.skipped_count,
        "errors": result.errors[:10],
        "status": dataset.status
    }


@router.get("/{dataset_id}/staging")
def get_staging_records(dataset_id: int, limit: int = 50, db: Session = Depends(get_db)):
    records = db.query(StagingReview).filter(StagingReview.dataset_id == dataset_id).limit(limit).all()
    return [
        {
            "id": r.id,
            "product_name": r.product_name,
            "rating": r.rating,
            "review_text": r.review_text[:100] if r.review_text else "",
            "review_date": str(r.review_date) if r.review_date else None,
            "status": r.status,
            "validation_errors": r.validation_errors
        }
        for r in records
    ]


@router.get("/{dataset_id}/errors")
def get_rejected_records(dataset_id: int, limit: int = 50, db: Session = Depends(get_db)):
    records = (
        db.query(StagingReview)
        .filter(StagingReview.dataset_id == dataset_id, StagingReview.status == "rejected")
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "product_name": r.product_name,
            "rating": r.rating,
            "review_text": r.review_text[:100] if r.review_text else "",
            "validation_errors": r.validation_errors
        }
        for r in records
    ]


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Cascade delete in proper order
    from app.models.warehouse import FactAspectSentiment, Recommendation, RoadmapScenario, MiningRun
    from app.models.feature_requests import FeatureRequest, EffortEstimate
    
    db.query(FactAspectSentiment).filter(FactAspectSentiment.dataset_id == dataset_id).delete()
    db.query(Recommendation).filter(Recommendation.dataset_id == dataset_id).delete()
    db.query(RoadmapScenario).filter(RoadmapScenario.dataset_id == dataset_id).delete()
    db.query(MiningRun).filter(MiningRun.dataset_id == dataset_id).delete()
    db.query(FeatureRequest).filter(FeatureRequest.dataset_id == dataset_id).delete()
    db.query(EffortEstimate).filter(EffortEstimate.dataset_id == dataset_id).delete()
    db.query(FactReview).filter(FactReview.dataset_id == dataset_id).delete()
    db.query(StagingReview).filter(StagingReview.dataset_id == dataset_id).delete()
    db.delete(dataset)
    db.commit()
    return {"status": "deleted", "dataset_id": dataset_id}
