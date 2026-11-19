# SignalWeave Data Warehouse & Database Specification
## Star Schema Architecture, Data Dictionary & Indexing Strategy

SignalWeave implements an enterprise-grade Star Schema dimensional model hosted in PostgreSQL 17. The design decouples operational staging from analytical querying, using surrogate integer primary keys across all dimension tables to optimize analytical join performance.

---

## Star Schema Overview

```
                      +-----------------------------+
                      |         dim_category        |
                      +-----------------------------+
                      | PK  category_id (INT)       |
                      |     category_name (VARCHAR) |
                      |     description (TEXT)      |
                      +--------------+--------------+
                                     | 1
                                     |
                                     | N
+-----------------------------+      |      +-----------------------------+
|         dim_product         |      |      |          dim_source         |
+-----------------------------+      |      +-----------------------------+
| PK  product_id (INT)        +------+      | PK  source_id (INT)         |
| FK  category_id (INT)       |             |     source_name (VARCHAR)   |
|     sku (VARCHAR)           |             |     source_type (VARCHAR)   |
|     product_name (VARCHAR)  |             +--------------+--------------+
|     model_number (VARCHAR)  |                            |
|     release_date (DATE)     |                            |
+--------------+--------------+                            |
               |                                           |
               | 1                                         | 1
               |                                           |
               | N                                         | N
       +-------+-------------------------------------------+-------+
       |                                                           |
       |                       fact_reviews                        |
       |                                                           |
       | PK    review_id (INT)                                     |
       | FK    product_key (INT) -> dim_product                    |
       | FK    customer_key (INT) -> dim_customer                  |
       | FK    date_key (INT) -> dim_date                          |
       | FK    source_key (INT) -> dim_source                      |
       |       dataset_id (INT) -> datasets                        |
       |       rating (FLOAT)                                      |
       |       review_text (TEXT)                                  |
       |       cleaned_text (TEXT)                                 |
       |       sentiment_label (VARCHAR)                           |
       |       sentiment_score (FLOAT)                             |
       |       vader_pos (FLOAT)                                   |
       |       vader_neu (FLOAT)                                   |
       |       vader_neg (FLOAT)                                   |
       |       vader_compound (FLOAT)                              |
       |       verified_purchase (BOOLEAN)                         |
       |       helpful_votes (INT)                                 |
       |       is_synthetic (BOOLEAN)                              |
       +-------+-------------------------------------------+-------+
               |                                           |
               | 1                                         | N
               |                                           |
               | N                                         | 1
+--------------+--------------+             +--------------+--------------+
|    fact_aspect_sentiment    |             |         dim_customer        |
+-----------------------------+             +-----------------------------+
| PK  id (INT)                |             | PK  customer_id (INT)       |
| FK  review_key (INT)        |             |     customer_id_ext (STR)   |
| FK  product_key (INT)       |             |     customer_name (VARCHAR) |
| FK  date_key (INT)          |             |     customer_segment (STR)  |
|     aspect (VARCHAR)        |             |     location (VARCHAR)      |
|     sentiment_label (STR)   |             +-----------------------------+
|     sentiment_score (FLOAT) |
|     confidence (FLOAT)      |
|     sentence_text (TEXT)    |
+--------------+--------------+
               | N
               |
               | 1
+--------------+--------------+
|           dim_date          |
+-----------------------------+
| PK  date_id (INT)           |
|     full_date (DATE)        |
|     day_of_week (INT)       |
|     day_name (VARCHAR)      |
|     month (INT)             |
|     month_name (VARCHAR)    |
|     quarter (INT)           |
|     year (INT)              |
|     is_weekend (BOOLEAN)    |
+-----------------------------+
```

---

## Detailed Data Dictionary

### Dimension Tables

#### 1. `dim_product`
Stores detailed information regarding individual products analyzed by the platform.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `product_id` | INTEGER | PRIMARY KEY, AUTO | Surrogate key |
| `category_id` | INTEGER | FOREIGN KEY -> `dim_category.category_id` | Category association |
| `sku` | VARCHAR(100) | NOT NULL, UNIQUE, INDEX | Stock Keeping Unit identifier |
| `product_name` | VARCHAR(255) | NOT NULL | Human-readable product name |
| `model_number` | VARCHAR(100) | NULLABLE | Hardware model or release version |
| `release_date` | DATE | NULLABLE | Initial launch date |

#### 2. `dim_category`
Product classification hierarchy level.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `category_id` | INTEGER | PRIMARY KEY, AUTO | Surrogate key |
| `category_name`| VARCHAR(100) | NOT NULL, UNIQUE | e.g., Audio, Wearables, Mobile |
| `description` | TEXT | NULLABLE | Category description |

#### 3. `dim_source`
Origin channels of collected feedback.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `source_id` | INTEGER | PRIMARY KEY, AUTO | Surrogate key |
| `source_name` | VARCHAR(100) | NOT NULL, UNIQUE | e.g., Amazon, BestBuy, AppStore |
| `source_type` | VARCHAR(50) | NULLABLE | e.g., E-Commerce, App Store, Social |

#### 4. `dim_date`
Pre-populated calendar dimension enabling high-speed roll-up and drill-down operations across time.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `date_id` | INTEGER | PRIMARY KEY | Integer date key (e.g. YYYYMMDD) |
| `full_date` | DATE | NOT NULL, UNIQUE, INDEX | Calendar date |
| `day_of_week` | INTEGER | NOT NULL | 1 (Monday) - 7 (Sunday) |
| `day_name` | VARCHAR(20) | NOT NULL | e.g., Monday, Tuesday |
| `month` | INTEGER | NOT NULL | 1 - 12 |
| `month_name` | VARCHAR(20) | NOT NULL | e.g., January, February |
| `quarter` | INTEGER | NOT NULL | 1 - 4 |
| `year` | INTEGER | NOT NULL | e.g., 2024, 2025, 2026 |
| `is_weekend` | BOOLEAN | NOT NULL | True if Saturday or Sunday |

#### 5. `dim_customer`
Customer attributes and demographic segmentation.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `customer_id` | INTEGER | PRIMARY KEY, AUTO | Surrogate key |
| `customer_id_ext`| VARCHAR(100)| NOT NULL, UNIQUE, INDEX | Natural business key from source |
| `customer_name`| VARCHAR(255)| NULLABLE | Customer display name |
| `customer_segment`| VARCHAR(50) | DEFAULT 'Standard' | Enterprise, Pro, Standard |
| `location` | VARCHAR(100) | NULLABLE | Geographic region or country |

---

### Fact Tables

#### 1. `fact_reviews`
Primary granular feedback event fact table.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `review_id` | INTEGER | PRIMARY KEY, AUTO | Fact surrogate key |
| `product_key` | INTEGER | FK -> `dim_product.product_id`, INDEX | Product foreign key |
| `customer_key`| INTEGER | FK -> `dim_customer.customer_id`, INDEX | Customer foreign key |
| `date_key` | INTEGER | FK -> `dim_date.date_id`, INDEX | Calendar date foreign key |
| `source_key` | INTEGER | FK -> `dim_source.source_id`, INDEX | Origin source foreign key |
| `dataset_id` | INTEGER | FK -> `datasets.id`, INDEX | Ingestion batch reference |
| `rating` | FLOAT | NOT NULL | Numeric customer score (1.0 - 5.0) |
| `review_text` | TEXT | NOT NULL | Original feedback text |
| `cleaned_text`| TEXT | NULLABLE | Lemmatized, preprocessed text |
| `sentiment_label`| VARCHAR(20) | INDEX | Positive, Neutral, Negative |
| `sentiment_score`| FLOAT | NULLABLE | VADER compound score (-1.0 to +1.0) |
| `vader_pos` | FLOAT | NULLABLE | VADER positive proportion |
| `vader_neu` | FLOAT | NULLABLE | VADER neutral proportion |
| `vader_neg` | FLOAT | NULLABLE | VADER negative proportion |
| `vader_compound`| FLOAT | NULLABLE | Exact compound score |
| `verified_purchase`| BOOLEAN | DEFAULT FALSE | Verified customer flag |
| `helpful_votes`| INTEGER | DEFAULT 0 | Helpful feedback count |
| `is_synthetic`| BOOLEAN | DEFAULT TRUE | Synthetic data marker |

#### 2. `fact_aspect_sentiment`
Granular feature-level sentiment extractions derived from review sentences.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO | Surrogate key |
| `review_key` | INTEGER | FK -> `fact_reviews.review_id`, INDEX | Parent review reference |
| `product_key` | INTEGER | FK -> `dim_product.product_id`, INDEX | Product dimension key |
| `date_key` | INTEGER | FK -> `dim_date.date_id`, INDEX | Temporal dimension key |
| `aspect` | VARCHAR(100) | NOT NULL, INDEX | Aspect category (e.g. battery) |
| `sentiment_label`| VARCHAR(20) | NOT NULL | Positive, Neutral, Negative |
| `sentiment_score`| FLOAT | NOT NULL | Sentence sentiment compound |
| `confidence` | FLOAT | DEFAULT 1.0 | Extraction confidence score |
| `sentence_text`| TEXT | NOT NULL | Exact clause extracted from review |

---

### Staging & Auxiliary Tables

- **`datasets`**: Tracks uploaded datasets, source filenames, total records, validation status, and column mappings.
- **`staging_reviews`**: Ephemeral landing table where unvalidated rows are stored before ETL transformation.
- **`staging_errors`**: Logs rows rejected by the validation rules with error descriptions and offending raw payloads.
- **`aspect_dictionary`**: Curated keyword taxonomy for aspect extraction.
- **`feature_requests`**: Stores extracted explicit feature requests and analyst review status (`pending`, `confirmed`, `rejected`).
- **`mining_runs`**: Stores parameters and output artifacts of unsupervised mining runs (topics, clusters, rules).
- **`recommendations`**: Evidence-backed recommendations generated from opportunity and pain analysis.
- **`roadmap_scenarios`**: Saved what-if scenario simulations.

---

## Indexing & Performance Strategy
1. **B-Tree Foreign Key Indexes**: Indexed foreign keys on `fact_reviews` (`product_key`, `customer_key`, `date_key`, `source_key`, `dataset_id`) and `fact_aspect_sentiment` to accelerate star-join aggregations.
2. **Compound Filter Indexes**:
   - `(product_key, date_key)` for rapid time-series filtering per product.
   - `(aspect, sentiment_label)` for fast aspect-based aggregation.
3. **Surrogate Key Natural Lookups**: Unique indexes on natural keys (`dim_product.sku`, `dim_customer.customer_id_ext`, `dim_source.source_name`) to enable high-throughput upsert resolution during ETL ingestion.
