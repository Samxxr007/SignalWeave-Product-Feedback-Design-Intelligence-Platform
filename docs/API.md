# SignalWeave API Reference
## RESTful Endpoints, Schemas & Operational Examples

Base API URL: `http://localhost:8000/api/v1`  
Interactive Swagger Documentation: `http://localhost:8000/docs`  
Interactive ReDoc Documentation: `http://localhost:8000/redoc`

---

## 1. System Health
- **`GET /health`**
  - **Description**: Verifies service status and database connectivity.
  - **Response 200 OK**:
    ```json
    {
      "status": "ok",
      "timestamp": "2026-11-19T07:15:00Z",
      "version": "1.0.0"
    }
    ```

---

## 2. Ingestion & Staging Endpoints (`/datasets`)

### `POST /api/v1/datasets/upload`
Upload a CSV, Excel (XLSX), or JSON file into the staging area. Automatically inspects headers and creates staging records.
- **Request**: Multipart Form Data (`file: UploadFile`)
- **Response 201 Created**:
  ```json
  {
    "id": 1,
    "name": "sample_feedback.csv",
    "file_type": "csv",
    "total_records": 1500,
    "status": "staged",
    "column_mapping": {
      "product_id": "product_sku",
      "product_name": "product_name",
      "review_text": "text",
      "rating": "stars",
      "date": "review_date"
    }
  }
  ```

### `POST /api/v1/datasets/{id}/validate`
Run quality assurance rules against staged data.
- **Validation Rules**: Range check ($1.0 \le \text{rating} \le 5.0$), null text checks, timestamp parsing.
- **Response 200 OK**:
  ```json
  {
    "dataset_id": 1,
    "total_staged": 1500,
    "valid_records": 1492,
    "rejected_records": 8,
    "status": "validated"
  }
  ```

### `POST /api/v1/datasets/{id}/load`
Executes ETL transformation from staging into the star schema warehouse (`fact_reviews`, dimensions).
- **Response 200 OK**:
  ```json
  {
    "dataset_id": 1,
    "warehouse_records_loaded": 1492,
    "status": "loaded"
  }
  ```

### Additional Ingestion Endpoints:
- `GET /api/v1/datasets`: List all uploaded datasets.
- `GET /api/v1/datasets/{id}`: Dataset metadata.
- `GET /api/v1/datasets/{id}/staging`: Inspect raw staged records.
- `GET /api/v1/datasets/{id}/errors`: Inspect validation failure logs.
- `DELETE /api/v1/datasets/{id}`: Clean cascading purge of dataset, facts, and staging rows.

---

## 3. Data Preprocessing Endpoints (`/datasets/{id}/preprocess`)

### `POST /api/v1/datasets/{id}/preprocess/clean`
Applies text normalization, regex cleaning, URL removal, and casing unification.

### `POST /api/v1/datasets/{id}/preprocess/nlp`
Executes NLTK word tokenization, POS tagging, lemmatization, and stopword removal.
- **Response 200 OK**:
  ```json
  {
    "dataset_id": 1,
    "processed_count": 1492,
    "avg_tokens_per_review": 42.6
  }
  ```

### `GET /api/v1/datasets/{id}/preprocess/sample`
Returns side-by-side before-and-after samples demonstrating preprocessing transformations.

---

## 4. OLAP Dimensional Operations (`/datasets/{id}/olap`)

### `POST /api/v1/datasets/{id}/olap/rollup`
Aggregate feedback from fine-grained product levels up to high-level categories or temporal periods.
- **Request Body**:
  ```json
  {
    "dimension": "category",
    "metrics": ["count", "avg_rating", "avg_sentiment"]
  }
  ```
- **Response 200 OK**:
  ```json
  [
    { "category_name": "Audio", "review_count": 420, "avg_rating": 3.82, "avg_sentiment": 0.24 },
    { "category_name": "Wearables", "review_count": 310, "avg_rating": 4.15, "avg_sentiment": 0.48 }
  ]
  ```

### `POST /api/v1/datasets/{id}/olap/drilldown`
Expands high-level summaries into detailed child levels (e.g. Category $\to$ Product SKUs).

### `POST /api/v1/datasets/{id}/olap/slice`
Restricts analysis to a single dimension predicate (e.g. `source = 'Amazon'`).

### `POST /api/v1/datasets/{id}/olap/dice`
Filters across multiple dimensions simultaneously:
- **Request Body**:
  ```json
  {
    "categories": ["Audio", "Mobile"],
    "rating_min": 1.0,
    "rating_max": 2.0,
    "sources": ["Amazon"],
    "start_date": "2025-01-01",
    "end_date": "2025-06-30"
  }
  ```

### `POST /api/v1/datasets/{id}/olap/pivot`
Computes two-dimensional cross-tabulated contingency tables (e.g. Category vs Rating score distributions).

---

## 5. Text Mining & Pattern Discovery Endpoints

### `POST /api/v1/datasets/{id}/sentiment/run`
Executes VADER lexicon sentiment scoring on all loaded reviews, computing compound, positive, neutral, and negative scores.

### `POST /api/v1/datasets/{id}/aspects/extract`
Extracts sentence-level aspects and maps them to `fact_aspect_sentiment`.
- **Response 200 OK**:
  ```json
  {
    "extracted_aspects_count": 3044,
    "aspect_summary": {
      "battery": 620,
      "sound_quality": 510,
      "comfort": 430
    }
  }
  ```

### `POST /api/v1/datasets/{id}/topics/run`
Applies TF-IDF vectorization and Non-Negative Matrix Factorization (NMF) to extract latent themes.
- **Request Body**:
  ```json
  {
    "n_topics": 5,
    "max_features": 1000
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "run_id": 12,
    "topics": [
      {
        "topic_id": 0,
        "label": "Battery Life & Charging",
        "top_keywords": ["battery", "charge", "drain", "hours", "cable", "life"],
        "prevalence": 0.31
      }
    ]
  }
  ```

### `POST /api/v1/datasets/{id}/clustering/run`
Performs K-Means clustering on TF-IDF vectors with automated Silhouette Score evaluation.
- **Request Body**: `{ "k": 4 }`

### `POST /api/v1/datasets/{id}/association/run`
Discovers frequent co-occurring aspects and issues using the Apriori algorithm via `mlxtend`.
- **Request Body**: `{ "min_support": 0.05, "min_confidence": 0.3 }`
- **Response 200 OK**:
  ```json
  {
    "rules": [
      {
        "antecedents": ["connectivity_issues"],
        "consequents": ["battery_drain"],
        "support": 0.082,
        "confidence": 0.64,
        "lift": 2.18
      }
    ]
  }
  ```

---

## 6. Innovation Endpoints

### `GET /api/v1/datasets/{id}/pain-index`
Calculates Product Pain Index (0–100) across all products.
- **Response 200 OK**:
  ```json
  [
    {
      "product_id": 4,
      "product_name": "SonicPulse Wireless ANC",
      "pain_index": 78.4,
      "negative_ratio": 0.42,
      "complaint_volume": 124,
      "recency_factor": 0.88,
      "rating_drop": 0.65,
      "severity": "CRITICAL"
    }
  ]
  ```

### `GET /api/v1/datasets/{id}/emerging-complaints`
Calculates velocity multipliers between baseline and evaluation time windows.
- **Parameters**: `eval_days=14`, `baseline_days=14`

### `GET /api/v1/datasets/{id}/features` & `PATCH /api/v1/features/{id}`
Inspect linguistic feature requests and update analyst review status (`confirmed`, `rejected`).

### `POST /api/v1/datasets/{id}/roadmap/simulate`
Simulates impact of proposed engineering fixes on customer sentiment.
- **Request Body**:
  ```json
  {
    "product_id": 4,
    "aspects_to_fix": [
      { "aspect": "battery", "remediation_pct": 75, "effort_points": 3 }
    ]
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "current_pain_index": 78.4,
    "projected_pain_index": 48.2,
    "pain_reduction": 30.2,
    "current_avg_rating": 3.12,
    "projected_avg_rating": 3.78,
    "efficiency_ratio": 10.07
  }
  ```
