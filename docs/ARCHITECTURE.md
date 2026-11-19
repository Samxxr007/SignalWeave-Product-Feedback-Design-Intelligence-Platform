# SignalWeave System Architecture
## Component Diagram, Service Boundaries & Data Flow

SignalWeave is engineered as a decoupled, multi-tier data warehousing and text mining intelligence platform.

```
+---------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER                                 |
|                                                                                       |
|   React 18 SPA (Vite + TypeScript + Tailwind CSS + Recharts + Framer Motion)          |
|                                                                                       |
|   Pages:                                                                              |
|   - Signal Command Center (/)               - Emerging Signals Radar (/signals)       |
|   - Data Intake Center (/intake)            - Product Opportunity Map (/opportunities)|
|   - Preprocessing Studio (/preparation)     - Feature Request Studio (/features)      |
|   - OLAP Explorer (/analytics)              - Roadmap Simulator (/roadmap)            |
|   - Data Mining Lab (/mining)               - Compliance & Reports (/reports)         |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            | HTTP REST API (JSON)
                                            v
+---------------------------------------------------------------------------------------+
|                                    APPLICATION LAYER                                  |
|                                                                                       |
|   FastAPI Service (Python 3.13 / Uvicorn / Pydantic v2)                               |
|                                                                                       |
|   Core Routers:                                                                       |
|   + datasets.py       - Upload, staging, column mapping, schema validation, ETL load  |
|   + preprocessing.py  - Text cleaning, tokenization, lemmatization, stopword removal  |
|   + olap.py           - Multidimensional roll-up, drill-down, slice, dice, pivot      |
|   + mining.py         - VADER sentiment, NMF topics, K-Means clustering, Apriori      |
|   + innovation.py     - Pain Index, Emerging Radar, Feature Extraction, Simulator    |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            | SQLAlchemy 2.0 ORM / Connection Pool
                                            v
+---------------------------------------------------------------------------------------+
|                                  DATA WAREHOUSE LAYER                                 |
|                                                                                       |
|   PostgreSQL 17 Database                                                              |
|                                                                                       |
|   [Staging Store]                     [Dimensional Star Schema]                       |
|   - datasets                          - dim_product       - fact_reviews              |
|   - staging_reviews                   - dim_category      - fact_aspect_sentiment     |
|   - staging_errors                    - dim_source                                    |
|                                       - dim_date                                      |
|   [Mining & Analytics Models]         - dim_customer                                  |
|   - aspect_dictionary                 - feature_requests                              |
|   - mining_runs                       - roadmap_scenarios                             |
|   - recommendations                   - effort_estimates                              |
+---------------------------------------------------------------------------------------+
```

---

## Service Boundaries & Subsystems

### 1. Ingestion & Staging Subsystem
- **Parser**: Robust parsing of CSV, XLSX, and JSON files via Pandas and OpenPyXL with chunked processing for large files.
- **Staging Area**: Unstructured incoming records are stored in `staging_reviews` with original column mappings.
- **Data Quality Validator**: Checks for missing fields, invalid ratings (outside 1.0–5.0), malformed timestamps, and corrupted text. Violations are logged to `staging_errors`.
- **ETL Transformation & Loader**: Performs surrogate key lookup, deduplication against existing customer and product records, temporal decomposition (`dim_date`), and loads verified rows into `fact_reviews`.

### 2. Text Preprocessing & NLP Engine
- **Normalizer**: Lowercasing, contraction expansion, URL/email removal, non-alphanumeric stripping.
- **NLTK Tokenizer & Lemmatizer**: WordNetLemmatizer and POS-tagged lemmatization for accurate morphological root reduction.
- **Stopword Filtering**: Standard English stopwords enhanced with domain-specific custom stopwords (e.g., "product", "item", "purchase").

### 3. Dimensional OLAP Aggregator
- **Roll-Up / Drill-Down**: Traverses hierarchical dimension levels:
  - Product Dimension: `SKU -> Product -> Category`
  - Temporal Dimension: `Day -> Month -> Quarter -> Year`
- **Slice & Dice**: SQL-level filtering across arbitrary combinations of dimensions (e.g., rating $\le 2$ on category 'Audio' from source 'Amazon' during Q3).
- **Pivot Matrix**: Two-dimensional cross-tabulation (e.g., Category $\times$ Rating distribution, Aspect $\times$ Sentiment distribution).

### 4. Text Mining & Pattern Discovery Engine
- **Sentiment Analyzer**: VADER (Valence Aware Dictionary and sEntiment Reasoner) computing positive, neutral, negative, and compound scores.
- **Aspect Extractor**: Sentence-level parsing against an aspect seed dictionary to evaluate fine-grained product components.
- **Topic Modeler**: Scikit-Learn TF-IDF vectorizer + Non-Negative Matrix Factorization (NMF) extracting latent thematic components.
- **Cluster Analyzer**: K-Means clustering with Silhouette Score validation and TF-IDF centroid interpretation.
- **Association Miner**: Transactional frequent itemset generation and Apriori rule mining via `mlxtend` evaluating support, confidence, and lift.

### 5. Innovation Decision Engine
- **Product Pain Index Calculator**: Multi-factor weighted formulation incorporating complaint volume, negative ratio, temporal recency, and rating degradation.
- **Emerging Complaint Radar**: Dual-window velocity calculator evaluating accelerating issues.
- **Roadmap Simulator**: Evidence-based simulation estimating pain reduction and rating recovery per engineering effort point.

---

## End-to-End Data Flow

```
[Raw Feedback File] (CSV/Excel/JSON)
         │
         ▼
[Ingestion Service] ──► Uploaded to server, metadata saved to `datasets`
         │
         ▼
[Staging Service]   ──► Staged in `staging_reviews` with source schema mapping
         │
         ▼
[Validation Service]──► Type validation, range checks, missing value detection
         │              Invalid rows marked and logged in `staging_errors`
         ▼
[ETL Loader]        ──► Extract distinct entities -> Upsert Dimensions:
                        dim_product, dim_category, dim_source, dim_date, dim_customer
                        Insert Fact: `fact_reviews` (Surrogate Keys)
         │
         ├────────────────────────────────────────┬──────────────────────────────────────┐
         ▼                                        ▼                                      ▼
[NLP & Mining Pipeline]                  [OLAP Aggregation]                   [Innovation Engine]
- Clean & lemmatize                      - Roll-up / Drill-down               - Pain Index scoring
- VADER sentiment -> `fact_reviews`      - Slice & Dice                       - Emerging radar
- Aspect extraction -> `fact_aspect_...` - Cross-tab Pivoting                 - Feature extraction
- NMF Topics & K-Means Clusters                                               - Roadmap what-if sim
- Apriori Association Rules
         │                                        │                                      │
         └────────────────────────────────────────┴──────────────────────────────────────┘
                                                  │
                                                  ▼
                               [SignalWeave Presentation UI]
```
