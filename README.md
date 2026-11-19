# SignalWeave
## Product Feedback Intelligence Platform
> Turn customer voices into better products.

SignalWeave is a full-stack academic capstone product for CSA1606 – Data Warehouse and Data Mining. It transforms raw customer feedback into actionable product-design decisions using genuine data warehousing, ETL, OLAP analytics, text mining, sentiment analysis, clustering, and association rule mining.

## Architecture
SignalWeave is engineered as a decoupled, multi-tier intelligence platform designed for dimensional analytical processing and text mining:

- **Client Tier**: React 18 single-page application built with TypeScript, Vite, Tailwind CSS, Recharts, and Framer Motion. Adheres to the editorial "Obsidian Pine & Archive Ivory" design system with responsive dashboards and interactive analytical tooling.
- **Application & Analytical Engine**: High-performance FastAPI (Python 3.13) REST backend powered by SQLAlchemy 2.0 ORM, Alembic migrations, Pandas, NumPy, Scikit-learn, NLTK, VADER, and mlxtend. Orchestrates ETL workflows, multidimensional OLAP aggregations, and data mining algorithms.
- **Data Storage Tier**: PostgreSQL 17 relational database architected into a Star Schema warehouse featuring 5 dimension tables (`dim_product`, `dim_category`, `dim_source`, `dim_date`, `dim_customer`) and 2 fact tables (`fact_reviews`, `fact_aspect_sentiment`), isolated staging tables, and analytical run stores.

```
                    ┌──────────────────────────────────────────┐
                    │      SignalWeave React 18 Frontend       │
                    │   (Vite, TypeScript, Tailwind, Recharts) │
                    └────────────────────┬─────────────────────┘
                                         │ HTTP REST (JSON)
                                         ▼
                    ┌──────────────────────────────────────────┐
                    │          FastAPI Backend Service         │
                    │  (Endpoints: Ingestion, OLAP, Mining)    │
                    └─────┬──────────────┬───────────────┬─────┘
                          │              │               │
            ┌─────────────┴──┐    ┌──────┴───────┐   ┌───┴─────────────┐
            │   ETL & Staging│    │ Data Mining  │   │ OLAP Aggregator │
            │   Validator    │    │ (NLTK, VADER,│   │ (Roll-up, Slice,│
            │                │    │ Sklearn, NMF)│   │  Dice, Pivot)   │
            └─────────────┬──┘    └──────┬───────┘   └───┬─────────────┘
                          │              │               │
                          ▼              ▼               ▼
                    ┌──────────────────────────────────────────┐
                    │          PostgreSQL 17 Database          │
                    │  (Star Schema Warehouse + Staging Store) │
                    └──────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Python 3.13+
- Node.js 20+
- PostgreSQL 17+

### Database Setup
```bash
psql -U postgres -c "CREATE DATABASE signalweave;"
psql -U postgres -c "CREATE USER sw_user WITH PASSWORD 'sw_password_2024';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE signalweave TO sw_user;"
psql -U postgres -d signalweave -c "GRANT ALL ON SCHEMA public TO sw_user;"
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Edit with your credentials
alembic upgrade head
python data/generate_dataset.py  # Generate sample data
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:5173
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Five Academic Modules
1. **Module 1**: Customer Feedback Collection & Data Warehousing (Star Schema ETL, surrogate keys, data staging, deduplication, schema validation)
2. **Module 2**: Data Cleaning & Preprocessing (NLP pipeline, tokenization, lemmatization, stopword filtering, casing normalization, regex cleansing)
3. **Module 3**: Exploratory Analysis & OLAP (Roll-up, Drill-down, Slice, Dice, Pivot across product, category, source, customer, and temporal dimensions)
4. **Module 4**: Text Mining & Pattern Discovery (VADER lexicon sentiment, rule-based sentence aspect extraction, TF-IDF + NMF topic modeling, K-Means clustering with silhouette validation, Apriori association rule mining)
5. **Module 5**: Product Insights & Visualization (Product Pain Index scoring, Opportunity quadrant mapping, Evidence-backed actionable recommendations)

## Five Innovation Features
1. **Product Pain Index** — Transparent, weighted product weakness scoring model accounting for negative ratio, review velocity, temporal recency decay, and rating degradation.
2. **Aspect-Based Sentiment Intelligence** — Sentence-level feature extraction mapping customer sentiments directly to modular product components.
3. **Emerging Complaint Radar** — Dual sliding-window velocity multiplier analysis surfacing accelerating customer pain points with statistical significance guards.
4. **Feature Request Intelligence** — Rule-based linguistic pattern matching capturing explicit feature requests and surfacing them for analyst review and grouping.
5. **Product Roadmap Simulator** — Evidence-based what-if scenario planning engine calculating projected pain reduction and rating recovery from targeted fixes.

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Framer Motion, Lucide React
- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2
- **Data Processing**: Pandas, NumPy, Scikit-learn, NLTK, VADER, mlxtend, SciPy
- **Database**: PostgreSQL 17 (Star Schema: 5 dimensions, 2 fact tables, staging stores)

## Data Note
All sample data included in this repository is synthetic demonstration data. It is clearly marked with `is_synthetic=true` and does not represent real customer feedback.

## Security
- Database credentials are stored in a local `.env` file (gitignored)
- Never commit `.env` or real credentials
- Uses a dedicated `sw_user` database role with minimal privileges

## Academic Coverage
This project implements genuine implementations of:
- Data Warehouse design (star schema with surrogate keys)
- ETL pipeline (extract → stage → validate → load)
- OLAP operations (roll-up, drill-down, slice, dice, pivot)
- Sentiment analysis (VADER lexicon-based)
- Aspect-based sentiment analysis (rule-based sentence-level)
- TF-IDF vectorization
- NMF topic modelling
- K-Means clustering
- Apriori association rule mining
