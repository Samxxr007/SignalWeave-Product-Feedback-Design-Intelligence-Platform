import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { Link } from 'react-router-dom'
import { ArrowRight, AlertTriangle, Flame, ShieldAlert, Cpu } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useAnalyticsSummary } from '../../hooks/useAnalytics'
import { usePainIndex, useEmergingComplaints } from '../../hooks/useInnovation'
import { useMiningHistory } from '../../hooks/useMining'
import MetricCard from '../../components/ui/MetricCard'
import ReviewDrawer from '../../components/ui/ReviewDrawer'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import { formatNumber, formatPct, formatRating, formatDateTime } from '../../utils/formatters'
import type { Review } from '../../types'

export const Overview: React.FC = () => {
  const { activeDatasetId, activeDatasetName } = useAppStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedReviews, setSelectedReviews] = useState<Review[]>([])
  const [drawerTitle, setDrawerTitle] = useState('')

  const { data: summary, isLoading: loadingSummary } = useAnalyticsSummary(activeDatasetId)
  const { data: painItems } = usePainIndex(activeDatasetId)
  const { data: emergingItems } = useEmergingComplaints(activeDatasetId)
  const { data: miningRuns } = useMiningHistory(activeDatasetId)

  // Derived or fallback data for Signal Landscape visualization
  const signalLandscapeData = (painItems || []).map((item, idx) => ({
    aspect: item.aspect,
    aspectIdx: idx,
    sentimentScore: -(item.pain_score / 50) + 1.0, // map pain 0..100 to +1..-1
    mentions: item.mention_count,
    isNegative: item.pain_score >= 50,
  }))

  const openDrawerWithReviews = (title: string, reviews: Review[]) => {
    setDrawerTitle(title)
    setSelectedReviews(reviews)
    setDrawerOpen(true)
  }

  if (!activeDatasetId) {
    return (
      <EmptyState
        icon={Cpu}
        title="No Active Dataset Selected"
        description="Select a loaded dataset from the command bar above or upload a customer feedback file in the Intake Center to start generating intelligence."
        actionLabel="Go to Data Intake"
        onAction={() => (window.location.href = '/intake')}
      />
    )
  }

  if (loadingSummary) {
    return <LoadingState message="Aggregating dataset signals..." />
  }

  const top3Emerging = (emergingItems || []).slice(0, 3)
  const top3Pain = (painItems || []).slice(0, 3)
  const recentRuns = (miningRuns || []).slice(0, 5)

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Editorial Hero */}
      <div className="space-y-2">
        <span className="section-label">Executive Briefing • {activeDatasetName}</span>
        <h1 className="font-display text-4xl sm:text-5xl text-pine font-normal tracking-tight leading-[1.15]">
          Understand what your customers are <span className="italic font-serif">really saying.</span>
        </h1>
        <p className="text-graphite font-body text-base max-w-2xl leading-relaxed">
          Turn thousands of customer voices into actionable product intelligence. SignalWeave weaves
          unstructured feedback into multidimensional OLAP cubes and algorithmic pain scores.
        </p>
      </div>

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Reviews Ingested"
          value={formatNumber(summary?.total_reviews || 0)}
          unit="verified"
          trend="neutral"
          trendValue="Production Warehouse"
          color="#182D29"
        />
        <MetricCard
          label="Average Customer Rating"
          value={formatRating(summary?.avg_rating || 0)}
          unit="/ 5.0"
          trend={summary?.avg_rating && summary.avg_rating >= 4 ? 'up' : 'down'}
          trendValue="Historical Average"
          color="#377E75"
        />
        <MetricCard
          label="Negative Feedback Ratio"
          value={formatPct(summary?.negative_pct || 0)}
          unit="dissatisfied"
          trend="down"
          trendValue="Primary Pain Driver"
          color="#E36B4B"
        />
        <MetricCard
          label="Active Emerging Issues"
          value={emergingItems?.length || 0}
          unit="aspects"
          trend="up"
          trendValue="Velocity Acceleration"
          color="#C5D66B"
        />
      </div>

      {/* Central Visual: Signal Landscape Scatter */}
      <div className="card-editorial space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone/50 pb-4">
          <div>
            <span className="section-label">Central Innovation Visual</span>
            <h2 className="font-display text-2xl text-pine font-semibold">Signal Landscape</h2>
            <p className="text-xs text-graphite font-body">
              Multi-aspect sentiment polarity vs. mention frequency. Coral marks friction clusters needing roadmap attention.
            </p>
          </div>
          <Link
            to="/opportunities"
            className="text-xs font-mono font-medium text-teal hover:underline inline-flex items-center gap-1"
          >
            Explore Opportunities <ArrowRight size={14} />
          </Link>
        </div>

        {signalLandscapeData.length === 0 ? (
          <div className="py-12 text-center text-graphite text-xs font-mono">
            Run Mining Lab (Sentiment & Aspects) to generate the signal landscape.
          </div>
        ) : (
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                <XAxis
                  dataKey="aspect"
                  stroke="#596662"
                  fontSize={11}
                  fontFamily="IBM Plex Mono"
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  dataKey="sentimentScore"
                  name="Sentiment Score"
                  domain={[-1, 1]}
                  stroke="#596662"
                  fontSize={11}
                  fontFamily="IBM Plex Mono"
                  label={{
                    value: 'Sentiment Polarity (-1 Negative to +1 Positive)',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 10,
                    fontFamily: 'IBM Plex Mono',
                    fill: '#596662',
                  }}
                />
                <ZAxis dataKey="mentions" range={[80, 700]} name="Mentions" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 rounded-xl border border-stone shadow-md text-xs font-mono space-y-1">
                          <p className="font-bold text-pine">{data.aspect}</p>
                          <p className="text-graphite">Sentiment: {data.sentimentScore.toFixed(2)}</p>
                          <p className="text-graphite">Mentions: {data.mentions}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter data={signalLandscapeData}>
                  {signalLandscapeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isNegative ? '#E36B4B' : '#377E75'}
                      fillOpacity={0.8}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Two-Column Previews: Emerging Signals & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emerging Signals Preview */}
        <div className="card-editorial space-y-4">
          <div className="flex items-center justify-between border-b border-stone/50 pb-3">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-coral" />
              <h3 className="font-display text-xl text-pine font-semibold">Emerging Friction Radar</h3>
            </div>
            <Link
              to="/signals"
              className="text-xs font-mono text-teal hover:underline inline-flex items-center gap-1"
            >
              Radar View <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-3">
            {top3Emerging.length === 0 ? (
              <p className="text-xs font-mono text-graphite py-6 text-center">
                No emerging complaints detected in current window.
              </p>
            ) : (
              top3Emerging.map((ec, idx) => (
                <div
                  key={idx}
                  onClick={() => openDrawerWithReviews(`Emerging Signal: ${ec.aspect}`, ec.sample_reviews || [])}
                  className="p-3.5 rounded-xl border border-stone/70 hover:border-citron bg-ivory/30 hover:bg-citron/10 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-pine">{ec.aspect}</span>
                      <span className="badge-citron">+{formatPct(ec.growth_rate * 100, 0)} velocity</span>
                    </div>
                    <p className="text-xs text-graphite font-mono mt-0.5">
                      {ec.recent_count} recent mentions (vs {ec.prior_count} baseline)
                    </p>
                  </div>
                  <span className="text-xs font-mono text-teal">View Evidence →</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Product Opportunities Preview */}
        <div className="card-editorial space-y-4">
          <div className="flex items-center justify-between border-b border-stone/50 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-coral" />
              <h3 className="font-display text-xl text-pine font-semibold">Top Pain Index Targets</h3>
            </div>
            <Link
              to="/opportunities"
              className="text-xs font-mono text-teal hover:underline inline-flex items-center gap-1"
            >
              Full Index <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-3">
            {top3Pain.length === 0 ? (
              <p className="text-xs font-mono text-graphite py-6 text-center">
                Calculate Pain Index in Opportunities to see prioritized aspects.
              </p>
            ) : (
              top3Pain.map((pi, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-stone/70 bg-white flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-pine">{pi.aspect}</span>
                      <span className="badge-negative">{formatPct(pi.neg_pct, 0)} Neg</span>
                    </div>
                    <p className="text-xs text-graphite font-mono">
                      Rating Impact: -{pi.rating_impact.toFixed(2)} pts | {pi.mention_count} reviews
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-lg font-bold text-coral">
                      {pi.pain_score.toFixed(1)}
                    </span>
                    <p className="text-[10px] font-mono uppercase text-graphite">Pain Score</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Mining Activity */}
      <div className="card-editorial space-y-3">
        <div className="flex items-center justify-between border-b border-stone/50 pb-2">
          <span className="section-label">Audit Trail</span>
          <Link to="/mining" className="text-xs font-mono text-teal hover:underline">
            Open Mining Lab →
          </Link>
        </div>
        <h3 className="font-display text-lg text-pine font-semibold">Recent Intelligence Engine Runs</h3>

        {recentRuns.length === 0 ? (
          <p className="text-xs font-mono text-graphite py-4 text-center">
            No algorithm runs recorded yet. Start in the Mining Lab.
          </p>
        ) : (
          <div className="divide-y divide-stone/40">
            {recentRuns.map((run) => (
              <div key={run.id} className="py-2.5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase text-pine">{run.mining_type}</span>
                  <span
                    className={
                      run.status === 'completed'
                        ? 'badge-positive'
                        : run.status === 'failed'
                        ? 'badge-negative'
                        : 'badge-neutral'
                    }
                  >
                    {run.status}
                  </span>
                </div>
                <span className="text-graphite">{formatDateTime(run.started_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Evidence Drawer */}
      <ReviewDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        reviews={selectedReviews}
      />
    </div>
  )
}
export default Overview
