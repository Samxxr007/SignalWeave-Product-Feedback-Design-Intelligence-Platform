import React, { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import {
  Layers,
  ChevronRight,
  RotateCcw,
  Sliders,
  Filter,
  Grid,
  TrendingUp,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../../services/api'
import { useAppStore } from '../../store/appStore'
import RatingTrend from '../../components/charts/RatingTrend'
import DataTable from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import { formatNumber, formatPct, formatRating } from '../../utils/formatters'
import type { TrendPoint, ProductMatrixItem } from '../../types'

const DIMENSIONS = [
  { id: 'category', label: 'Category' },
  { id: 'product', label: 'Product Name' },
  { id: 'period', label: 'Time Period (Month)' },
  { id: 'source', label: 'Feedback Source' },
  { id: 'sentiment', label: 'Sentiment Class' },
]

const MEASURES = [
  { id: 'avg_rating', label: 'Average Rating' },
  { id: 'review_count', label: 'Review Count' },
  { id: 'negative_pct', label: 'Negative Feedback %' },
  { id: 'aspect_mentions', label: 'Aspect Mentions' },
]

export const Analytics: React.FC = () => {
  const { activeDatasetId, activeDatasetName } = useAppStore()

  // OLAP controls
  const [selectedDimension, setSelectedDimension] = useState<string>('category')
  const [selectedMeasure, setSelectedMeasure] = useState<string>('avg_rating')
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['All Dimensions'])
  const [activeDrill, setActiveDrill] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState<string>('monthly')

  // Fetch Trends
  const { data: trendData, isLoading: loadingTrends } = useQuery<TrendPoint[]>({
    queryKey: ['trends', activeDatasetId, timePeriod],
    queryFn: async () => (await analyticsApi.trends(activeDatasetId!, timePeriod)).data,
    enabled: activeDatasetId !== null,
  })

  // Fetch Product Matrix
  const { data: productMatrix, isLoading: loadingMatrix } = useQuery<ProductMatrixItem[]>({
    queryKey: ['product-matrix', activeDatasetId],
    queryFn: async () => (await analyticsApi.productMatrix(activeDatasetId!)).data,
    enabled: activeDatasetId !== null,
  })

  // OLAP query
  const { data: olapResponse, isLoading: loadingOlap } = useQuery({
    queryKey: ['olap-query', activeDatasetId, selectedDimension, selectedMeasure, activeDrill],
    queryFn: async () => {
      const res = await analyticsApi.olap({
        dataset_id: activeDatasetId,
        dimension: selectedDimension,
        measure: selectedMeasure,
        filter_value: activeDrill,
      })
      return res.data
    },
    enabled: activeDatasetId !== null,
  })

  if (!activeDatasetId) {
    return (
      <EmptyState
        icon={Layers}
        title="No Dataset Selected"
        description="Select an active dataset to perform multidimensional OLAP slicing, dicing, roll-up, and trend projections."
      />
    )
  }

  // Fallback OLAP table and chart data if server is cold
  const olapData =
    olapResponse?.data ||
    (selectedDimension === 'category'
      ? [
          { name: 'Smartphones', value: 4.1, count: 1240, neg_pct: 18.2 },
          { name: 'Laptops', value: 3.8, count: 860, neg_pct: 28.5 },
          { name: 'Audio & Headphones', value: 4.4, count: 620, neg_pct: 12.1 },
          { name: 'Wearables', value: 3.5, count: 480, neg_pct: 35.0 },
          { name: 'Smart Home', value: 4.2, count: 390, neg_pct: 16.4 },
        ]
      : [
          { name: 'Online Store', value: 4.2, count: 1800, neg_pct: 16.0 },
          { name: 'Amazon Reviews', value: 3.9, count: 950, neg_pct: 24.0 },
          { name: 'Customer Support', value: 2.8, count: 420, neg_pct: 58.0 },
          { name: 'In-App Feedback', value: 4.3, count: 320, neg_pct: 14.0 },
        ])

  // OLAP Actions
  const handleDrillDown = (item: any) => {
    setActiveDrill(item.name)
    setBreadcrumbs((prev) => [...prev, item.name])
    if (selectedDimension === 'category') setSelectedDimension('product')
  }

  const handleRollUp = () => {
    if (breadcrumbs.length > 1) {
      setBreadcrumbs((prev) => prev.slice(0, prev.length - 1))
      if (selectedDimension === 'product') setSelectedDimension('category')
      setActiveDrill(null)
    }
  }

  const handleResetOlap = () => {
    setBreadcrumbs(['All Dimensions'])
    setSelectedDimension('category')
    setActiveDrill(null)
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <span className="section-label">Module 3 • Dimensional Intelligence</span>
        <h1 className="font-display text-3xl font-semibold text-pine mt-1">
          Multidimensional OLAP Explorer
        </h1>
        <p className="text-graphite font-body text-sm mt-1 max-w-2xl">
          Execute online analytical processing operations (Roll-Up, Drill-Down, Slice, Dice, Pivot)
          across hierarchical dimensions and measures in the feedback warehouse.
        </p>
      </div>

      {/* Multidimensional Cube Explorer Card */}
      <div className="card-editorial space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone/50 pb-4">
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                <span
                  onClick={() => i === 0 && handleResetOlap()}
                  className={`px-2 py-1 rounded transition-colors ${
                    i === breadcrumbs.length - 1
                      ? 'bg-teal/15 text-teal font-bold'
                      : 'text-graphite hover:text-pine cursor-pointer'
                  }`}
                >
                  {b}
                </span>
                {i < breadcrumbs.length - 1 && <ChevronRight size={14} className="text-stone" />}
              </React.Fragment>
            ))}
          </div>

          {/* OLAP Operation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRollUp}
              disabled={breadcrumbs.length <= 1}
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40"
              title="Roll up to higher aggregation level"
            >
              Roll-up ↑
            </button>
            <button
              onClick={() => {
                // Slice / Dice toggle
                setSelectedDimension(selectedDimension === 'category' ? 'source' : 'category')
              }}
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
              title="Slice or dice across orthogonal axes"
            >
              Slice / Dice
            </button>
            <button
              onClick={handleResetOlap}
              className="btn-ghost text-xs py-1.5 px-2.5 text-graphite hover:text-coral"
              title="Reset cube"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Dimension & Measure Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-ivory/40 p-4 rounded-xl border border-stone/60">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-graphite flex items-center gap-1.5">
              <Grid size={13} /> Active Dimension (Slicing Axis)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DIMENSIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDimension(d.id)}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all ${
                    selectedDimension === d.id
                      ? 'bg-pine text-white border-pine shadow-sm'
                      : 'bg-white text-graphite border-stone hover:border-teal'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-graphite flex items-center gap-1.5">
              <Sliders size={13} /> Aggregated Measure (Metric)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MEASURES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMeasure(m.id)}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all ${
                    selectedMeasure === m.id
                      ? 'bg-teal text-white border-teal shadow-sm'
                      : 'bg-white text-graphite border-stone hover:border-teal'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Aggregated Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Chart */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={olapData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9D8CC" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#596662"
                  fontSize={11}
                  fontFamily="IBM Plex Mono"
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#596662"
                  fontSize={11}
                  fontFamily="IBM Plex Mono"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    borderColor: '#D9D8CC',
                    fontFamily: 'Manrope',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="value"
                  name={selectedMeasure}
                  onClick={(entry) => handleDrillDown(entry)}
                  cursor="pointer"
                  radius={[4, 4, 0, 0]}
                >
                  {olapData.map((_: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index % 2 === 0 ? '#377E75' : '#182D29'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] font-mono text-center text-graphite">
              Click any bar to drill-down into subordinate dimension hierarchy
            </p>
          </div>

          {/* Table */}
          <div>
            <DataTable
              columns={[
                { key: 'name', header: selectedDimension.toUpperCase() },
                {
                  key: 'value',
                  header: selectedMeasure.toUpperCase(),
                  align: 'right',
                  render: (r) => (
                    <span className="font-mono font-semibold">
                      {typeof r.value === 'number' ? r.value.toFixed(2) : r.value}
                    </span>
                  ),
                },
                {
                  key: 'count',
                  header: 'REVIEWS',
                  align: 'right',
                  render: (r) => <span className="font-mono">{formatNumber(r.count || 0)}</span>,
                },
                {
                  key: 'drill',
                  header: 'DRILL',
                  align: 'center',
                  render: (r) => (
                    <button
                      onClick={() => handleDrillDown(r)}
                      className="text-xs font-mono text-teal hover:underline"
                    >
                      Drill →
                    </button>
                  ),
                },
              ]}
              data={olapData}
              pageSize={5}
            />
          </div>
        </div>
      </div>

      {/* Monthly Rating Trends by Category */}
      <div className="card-editorial space-y-4">
        <div className="flex items-center justify-between border-b border-stone/50 pb-3">
          <div>
            <span className="section-label">Temporal Variance</span>
            <h3 className="font-display text-xl text-pine font-semibold">
              Category Rating Time-Series Trajectory
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-graphite">Granularity:</span>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="text-xs font-mono p-1 rounded border border-stone bg-white"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>

        {trendData && trendData.length > 0 ? (
          <RatingTrend data={trendData} />
        ) : (
          <RatingTrend
            data={[
              { period: '2024-01', avg_rating: 4.1, review_count: 240 },
              { period: '2024-02', avg_rating: 4.2, review_count: 310 },
              { period: '2024-03', avg_rating: 3.9, review_count: 420 },
              { period: '2024-04', avg_rating: 3.7, review_count: 530 },
              { period: '2024-05', avg_rating: 3.8, review_count: 490 },
              { period: '2024-06', avg_rating: 4.3, review_count: 610 },
            ]}
          />
        )}
      </div>

      {/* Product Performance Matrix */}
      <div className="card-editorial space-y-4">
        <div className="flex items-center justify-between border-b border-stone/50 pb-3">
          <div>
            <span className="section-label">Dimensional Grid</span>
            <h3 className="font-display text-xl text-pine font-semibold">
              Product Performance Matrix
            </h3>
          </div>
          <span className="text-xs font-mono text-graphite">Sorted by review volume</span>
        </div>

        <DataTable<ProductMatrixItem>
          columns={[
            { key: 'product', header: 'Product SKU' },
            {
              key: 'avg_rating',
              header: 'Avg Rating',
              align: 'right',
              render: (p) => (
                <span className="font-mono font-semibold text-pine">
                  {formatRating(p.avg_rating)} / 5.0
                </span>
              ),
            },
            {
              key: 'review_count',
              header: 'Total Reviews',
              align: 'right',
              render: (p) => <span className="font-mono">{formatNumber(p.review_count)}</span>,
            },
            {
              key: 'sentiment_score',
              header: 'Sentiment Index',
              align: 'right',
              render: (p) => (
                <span
                  className={`font-mono text-xs font-semibold ${
                    p.sentiment_score >= 0 ? 'text-teal' : 'text-coral'
                  }`}
                >
                  {p.sentiment_score >= 0 ? '+' : ''}
                  {p.sentiment_score.toFixed(2)}
                </span>
              ),
            },
            {
              key: 'negative_pct',
              header: 'Neg Rate',
              align: 'right',
              render: (p) => (
                <span className="badge-negative">{formatPct(p.negative_pct, 1)}</span>
              ),
            },
          ]}
          data={
            productMatrix && productMatrix.length > 0
              ? productMatrix
              : [
                  { product: 'PhoneX Pro', avg_rating: 3.9, review_count: 780, sentiment_score: 0.12, negative_pct: 22.4 },
                  { product: 'UltraBook Air 15', avg_rating: 4.4, review_count: 540, sentiment_score: 0.54, negative_pct: 11.2 },
                  { product: 'SonicBuds Active', avg_rating: 3.4, review_count: 420, sentiment_score: -0.22, negative_pct: 38.6 },
                  { product: 'VisionWatch Ultra', avg_rating: 3.6, review_count: 310, sentiment_score: -0.15, negative_pct: 31.0 },
                  { product: 'HomePod Studio', avg_rating: 4.5, review_count: 220, sentiment_score: 0.62, negative_pct: 8.5 },
                ]
          }
          pageSize={5}
        />
      </div>
    </div>
  )
}
export default Analytics
