// ============================================================
// Core Entities
// ============================================================

export interface Dataset {
  id: number
  name: string
  file_type: string
  total_records: number
  staged_records: number
  valid_records: number
  rejected_records: number
  warehouse_records: number
  status: 'uploaded' | 'staged' | 'validated' | 'loaded'
  uploaded_at: string
  column_mapping?: Record<string, string>
  is_sample: boolean
}

export interface DatasetStats {
  total_records: number
  columns: string[]
  sample_rows: Record<string, unknown>[]
  dtypes: Record<string, string>
  missing_pct: Record<string, number>
}

export interface DatasetPreview {
  columns: string[]
  rows: Record<string, unknown>[]
  total: number
}

export interface ValidationResult {
  passed: number
  failed: number
  rejection_reasons: RejectionReason[]
}

export interface RejectionReason {
  reason: string
  count: number
  sample_rows: number[]
}

export interface WarehouseStats {
  dim_product_count: number
  dim_category_count: number
  dim_source_count: number
  dim_date_count: number
  fact_review_count: number
}

// ============================================================
// Preprocessing
// ============================================================

export interface PreprocessingStatus {
  dataset_id: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  processed_count: number
  total_count: number
  started_at?: string
  completed_at?: string
  error?: string
}

export interface ReviewInspection {
  review_id: number
  original_text: string
  cleaned_text: string
  tokens: string[]
  lemmatized: string[]
  keywords: string[]
  operations_applied: string[]
}

export interface QualityReport {
  dataset_id: number
  missing_pct: number
  duplicate_pct: number
  avg_text_length: number
  quality_score: number
  total_reviews: number
  issues: string[]
}

// ============================================================
// Analytics
// ============================================================

export interface AnalyticsSummary {
  dataset_id: number
  total_reviews: number
  avg_rating: number
  negative_pct: number
  positive_pct: number
  neutral_pct: number
  date_range: { from: string; to: string }
  top_products: Array<{ product: string; count: number; avg_rating: number }>
  top_categories: Array<{ category: string; count: number }>
}

export interface OlapResult {
  dimensions: string[]
  measures: string[]
  data: Record<string, unknown>[]
  breadcrumb: string[]
}

export interface TrendPoint {
  period: string
  avg_rating: number
  review_count: number
  sentiment_score?: number
  category?: string
}

export interface ProductMatrixItem {
  product: string
  avg_rating: number
  review_count: number
  sentiment_score: number
  negative_pct: number
}

export interface SentimentDistribution {
  positive: number
  negative: number
  neutral: number
  by_group?: Array<{ group: string; positive: number; negative: number; neutral: number }>
}

// ============================================================
// Mining
// ============================================================

export type MiningType = 'sentiment' | 'aspects' | 'topics' | 'clustering' | 'association'
export type MiningStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface MiningRun {
  id: number
  dataset_id: number
  mining_type: MiningType
  status: MiningStatus
  started_at: string
  completed_at?: string
  parameters: Record<string, unknown>
  result_summary?: Record<string, unknown>
}

export interface SentimentResult {
  run_id: number
  distribution: { positive: number; negative: number; neutral: number }
  by_category: Array<{ category: string; positive: number; negative: number; neutral: number }>
  by_product: Array<{ product: string; positive: number; negative: number; neutral: number }>
  sample_reviews: { positive: Review[]; negative: Review[]; neutral: Review[] }
}

export interface TopicResult {
  run_id: number
  n_components: number
  algorithm: string
  topics: Topic[]
}

export interface Topic {
  id: number
  keywords: string[]
  doc_count: number
  representative_reviews: Review[]
}

export interface ClusterResult {
  run_id: number
  k: number
  algorithm: string
  random_state: number
  clusters: Cluster[]
}

export interface Cluster {
  id: number
  size: number
  keywords: string[]
  sentiment_distribution: { positive: number; negative: number; neutral: number }
  representative_reviews: Review[]
}

export interface AssociationResult {
  run_id: number
  min_support: number
  min_confidence: number
  algorithm: string
  rules: AssociationRule[]
}

export interface AssociationRule {
  antecedents: string[]
  consequents: string[]
  support: number
  confidence: number
  lift: number
}

export interface AspectDictionaryEntry {
  id: number
  aspect_name: string
  keywords: string[]
  category?: string
}

// ============================================================
// Innovation
// ============================================================

export interface PainIndexResult {
  aspect: string
  pain_score: number
  neg_pct: number
  frequency: number
  recency_growth: number
  rating_impact: number
  mention_count: number
  factor_breakdown: {
    neg_pct_contribution: number
    freq_contribution: number
    recency_contribution: number
    rating_contribution: number
  }
}

export interface EmergingComplaint {
  aspect: string
  recent_count: number
  prior_count: number
  growth_rate: number
  data_quality: 'sufficient' | 'limited' | 'insufficient'
  sample_reviews: Review[]
  trend: 'emerging' | 'stable' | 'declining'
}

export interface FeatureRequest {
  id: number
  raw_text: string
  pattern_matched: string
  confidence: number
  product?: string
  status: 'pending' | 'confirmed' | 'rejected'
  created_at: string
}

export interface FeatureTheme {
  theme: string
  mention_count: number
  sample_texts: string[]
}

export interface OpportunityMapItem {
  aspect: string
  pain_score: number
  effort_estimate: number
  mention_count: number
  quadrant: 'quick_win' | 'strategic' | 'low_priority' | 'investigate'
}

export interface RoadmapScenario {
  id: number
  name: string
  dataset_id: number
  selected_aspects: string[]
  effort_estimates: Record<string, number>
  created_at: string
  estimated_impact: {
    reviews_addressed: number
    aspects_resolved: number
    pain_reduction: number
    improvements: Array<{ aspect: string; pain_score: number; effort: number; reviews: number }>
  }
}

// ============================================================
// Review (shared)
// ============================================================

export interface Review {
  id: number
  text: string
  rating: number
  date: string
  product?: string
  category?: string
  source?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
  sentiment_score?: number
}

// ============================================================
// Misc
// ============================================================

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down'
  database: 'connected' | 'disconnected'
  version: string
}
