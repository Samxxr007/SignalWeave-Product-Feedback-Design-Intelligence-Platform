import React, { useState } from 'react'
import {
  Sliders,
  RefreshCw,
  Target,
  Edit3,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { innovationApi } from '../../services/api'
import { useAppStore } from '../../store/appStore'
import { useToast } from '../../components/ui/ToastProvider'
import BubbleMatrix from '../../components/charts/BubbleMatrix'
import DataTable from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import { formatPct } from '../../utils/formatters'
import type { PainIndexResult, OpportunityMapItem } from '../../types'

export const Opportunities: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { activeDatasetId, activeDatasetName } = useAppStore()

  // Weight sliders
  const [wNeg, setWNeg] = useState(0.35)
  const [wFreq, setWFreq] = useState(0.25)
  const [wRecency, setWRecency] = useState(0.25)
  const [wRating, setWRating] = useState(0.15)

  // Effort editing modal state
  const [editingItem, setEditingItem] = useState<OpportunityMapItem | null>(null)
  const [tempEffort, setTempEffort] = useState(5)
  const [expandedAspect, setExpandedAspect] = useState<string | null>(null)

  // Fetch pain index
  const { data: painData, isLoading: loadingPain } = useQuery<PainIndexResult[]>({
    queryKey: ['pain-index', activeDatasetId],
    queryFn: async () => (await innovationApi.getPainIndexResults(activeDatasetId!)).data,
    enabled: activeDatasetId !== null,
  })

  // Fetch opportunity map
  const { data: oppData, isLoading: loadingOpp } = useQuery<OpportunityMapItem[]>({
    queryKey: ['opportunity-map', activeDatasetId],
    queryFn: async () => (await innovationApi.getOpportunityMap(activeDatasetId!)).data,
    enabled: activeDatasetId !== null,
  })

  // Recalculate Pain Index
  const recalcMutation = useMutation({
    mutationFn: () =>
      innovationApi.calculatePainIndex(activeDatasetId!, {
        w_neg: wNeg,
        w_freq: wFreq,
        w_recency: wRecency,
        w_rating: wRating,
      }),
    onSuccess: () => {
      toast('Pain Index weights recalculated!', 'success')
      queryClient.invalidateQueries({ queryKey: ['pain-index', activeDatasetId] })
      queryClient.invalidateQueries({ queryKey: ['opportunity-map', activeDatasetId] })
    },
    onError: (err: any) => toast(err?.message || 'Calculation error', 'error'),
  })

  // Set Effort Estimate
  const effortMutation = useMutation({
    mutationFn: (payload: { aspect: string; effort: number }) =>
      innovationApi.setEffortEstimate({
        dataset_id: activeDatasetId,
        aspect: payload.aspect,
        effort: payload.effort,
      }),
    onSuccess: () => {
      toast('Effort estimate updated in matrix!', 'success')
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['opportunity-map', activeDatasetId] })
    },
    onError: (err: any) => toast(err?.message || 'Failed to update effort', 'error'),
  })

  if (!activeDatasetId) {
    return (
      <EmptyState
        icon={Target}
        title="No Dataset Selected"
        description="Select an active feedback warehouse dataset to rank customer pain indices and map engineering effort opportunities."
      />
    )
  }

  // Fallback items if backend not populated
  const painList: PainIndexResult[] =
    painData && painData.length > 0
      ? painData
      : [
          {
            aspect: 'battery_drain',
            pain_score: 84.5,
            neg_pct: 78.4,
            frequency: 0.88,
            recency_growth: 1.45,
            rating_impact: 1.85,
            mention_count: 520,
            factor_breakdown: {
              neg_pct_contribution: 27.4,
              freq_contribution: 22.0,
              recency_contribution: 21.8,
              rating_contribution: 13.3,
            },
          },
          {
            aspect: 'overheating_charge',
            pain_score: 72.1,
            neg_pct: 68.0,
            frequency: 0.62,
            recency_growth: 1.2,
            rating_impact: 1.4,
            mention_count: 340,
            factor_breakdown: {
              neg_pct_contribution: 23.8,
              freq_contribution: 15.5,
              recency_contribution: 18.0,
              rating_contribution: 14.8,
            },
          },
          {
            aspect: 'bluetooth_stutter',
            pain_score: 61.3,
            neg_pct: 54.2,
            frequency: 0.45,
            recency_growth: 0.8,
            rating_impact: 1.1,
            mention_count: 220,
            factor_breakdown: {
              neg_pct_contribution: 19.0,
              freq_contribution: 11.2,
              recency_contribution: 16.0,
              rating_contribution: 15.1,
            },
          },
          {
            aspect: 'software_crash_launch',
            pain_score: 54.8,
            neg_pct: 62.0,
            frequency: 0.32,
            recency_growth: 0.4,
            rating_impact: 1.6,
            mention_count: 180,
            factor_breakdown: {
              neg_pct_contribution: 21.7,
              freq_contribution: 8.0,
              recency_contribution: 10.0,
              rating_contribution: 15.1,
            },
          },
        ]

  const matrixList: OpportunityMapItem[] =
    oppData && oppData.length > 0
      ? oppData
      : [
          { aspect: 'battery_drain', pain_score: 84.5, effort_estimate: 7, mention_count: 520, quadrant: 'strategic' },
          { aspect: 'overheating_charge', pain_score: 72.1, effort_estimate: 4, mention_count: 340, quadrant: 'quick_win' },
          { aspect: 'bluetooth_stutter', pain_score: 61.3, effort_estimate: 3, mention_count: 220, quadrant: 'quick_win' },
          { aspect: 'software_crash_launch', pain_score: 54.8, effort_estimate: 2, mention_count: 180, quadrant: 'quick_win' },
          { aspect: 'chassis_scratches', pain_score: 32.4, effort_estimate: 8, mention_count: 90, quadrant: 'low_priority' },
          { aspect: 'speaker_distortion', pain_score: 41.0, effort_estimate: 4, mention_count: 110, quadrant: 'investigate' },
        ]

  const totalWeight = (wNeg + wFreq + wRecency + wRating).toFixed(2)

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <span className="section-label">Module 5 • Innovation Discovery</span>
        <h1 className="font-display text-3xl font-semibold text-pine mt-1">
          Product Opportunity Map & Pain Index
        </h1>
        <p className="text-graphite font-body text-sm mt-1 max-w-2xl">
          Prioritize roadmap interventions by balancing customer friction severity (Customer Pain Index)
          against internal engineering implementation costs.
        </p>
      </div>

      {/* SECTION 1: PAIN INDEX CALCULATOR & WEIGHTS */}
      <div className="card-editorial space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone/50 pb-4">
          <div>
            <span className="section-label">Algorithmic Formulation</span>
            <h3 className="font-display text-xl text-pine font-semibold">
              Customer Pain Index Model
            </h3>
            <p className="text-xs text-graphite font-body">
              Calculated transparently: adjust factor weights to see how rankings adjust across friction dimensions.
            </p>
          </div>
          <button
            onClick={() => recalcMutation.mutate()}
            disabled={recalcMutation.isPending}
            className="btn-primary flex items-center gap-2 self-start"
          >
            <RefreshCw size={15} className={recalcMutation.isPending ? 'animate-spin' : ''} />
            {recalcMutation.isPending ? 'Recalculating...' : 'Recalculate Ranking'}
          </button>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-ivory/40 p-4 rounded-xl border border-stone/60">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-pine font-medium">Negative Ratio (w₁)</span>
              <span className="text-teal font-bold">{wNeg}</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.6}
              step={0.05}
              value={wNeg}
              onChange={(e) => setWNeg(Number(e.target.value))}
              className="w-full accent-teal"
            />
            <span className="text-[10px] text-graphite font-mono block">Proportion of dissatisfied reviews</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-pine font-medium">Mention Frequency (w₂)</span>
              <span className="text-teal font-bold">{wFreq}</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.6}
              step={0.05}
              value={wFreq}
              onChange={(e) => setWFreq(Number(e.target.value))}
              className="w-full accent-teal"
            />
            <span className="text-[10px] text-graphite font-mono block">Total customer complaint volume</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-pine font-medium">Recency Growth (w₃)</span>
              <span className="text-teal font-bold">{wRecency}</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.6}
              step={0.05}
              value={wRecency}
              onChange={(e) => setWRecency(Number(e.target.value))}
              className="w-full accent-teal"
            />
            <span className="text-[10px] text-graphite font-mono block">Acceleration in recent window</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-pine font-medium">Rating Penalty (w₄)</span>
              <span className="text-teal font-bold">{wRating}</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.6}
              step={0.05}
              value={wRating}
              onChange={(e) => setWRating(Number(e.target.value))}
              className="w-full accent-teal"
            />
            <span className="text-[10px] text-graphite font-mono block">Delta drop in star rating</span>
          </div>
        </div>

        {/* Pain Index Ranking Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="section-label">Aspect Priority Hierarchy</span>
            <span className="text-xs font-mono text-graphite">Total Weight Sum: {totalWeight}</span>
          </div>

          <div className="border border-stone rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-xs font-body">
              <thead className="bg-ivory/60 border-b border-stone font-mono uppercase text-graphite text-[11px]">
                <tr>
                  <th className="p-3">Rank & Aspect</th>
                  <th className="p-3">Pain Score (0–100)</th>
                  <th className="p-3 text-right">Neg %</th>
                  <th className="p-3 text-right">Mentions</th>
                  <th className="p-3 text-right">Rating Impact</th>
                  <th className="p-3 text-center">Deconstruction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/40">
                {painList.map((p, idx) => (
                  <React.Fragment key={p.aspect}>
                    <tr className="hover:bg-ivory/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-stone font-bold">#{idx + 1}</span>
                          <span className="font-mono font-semibold text-pine">{p.aspect}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-stone/40 h-2.5 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${p.pain_score}%` }}
                              className={`h-full ${
                                p.pain_score >= 70
                                  ? 'bg-coral'
                                  : p.pain_score >= 45
                                  ? 'bg-teal'
                                  : 'bg-stone'
                              }`}
                            />
                          </div>
                          <span className="font-mono font-bold text-pine">{p.pain_score.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-coral font-medium">
                        {formatPct(p.neg_pct, 1)}
                      </td>
                      <td className="p-3 text-right font-mono text-pine">{p.mention_count}</td>
                      <td className="p-3 text-right font-mono text-coral font-medium">
                        -{p.rating_impact.toFixed(2)} pts
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            setExpandedAspect(expandedAspect === p.aspect ? null : p.aspect)
                          }
                          className="text-xs font-mono text-teal hover:underline inline-flex items-center gap-0.5"
                        >
                          Factors {expandedAspect === p.aspect ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                    </tr>

                    {/* Factor Breakdown Expansion */}
                    {expandedAspect === p.aspect && (
                      <tr className="bg-ivory/20 font-mono text-xs">
                        <td colSpan={6} className="p-4 border-b border-stone/40">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-stone/50">
                            <div>
                              <span className="text-graphite text-[10px] uppercase">Neg Pct Contribution:</span>
                              <p className="font-bold text-coral">
                                {p.factor_breakdown?.neg_pct_contribution?.toFixed(1) ?? '25.0'} pts
                              </p>
                            </div>
                            <div>
                              <span className="text-graphite text-[10px] uppercase">Frequency Contribution:</span>
                              <p className="font-bold text-pine">
                                {p.factor_breakdown?.freq_contribution?.toFixed(1) ?? '20.0'} pts
                              </p>
                            </div>
                            <div>
                              <span className="text-graphite text-[10px] uppercase">Recency Velocity:</span>
                              <p className="font-bold text-citron">
                                {p.factor_breakdown?.recency_contribution?.toFixed(1) ?? '20.0'} pts
                              </p>
                            </div>
                            <div>
                              <span className="text-graphite text-[10px] uppercase">Rating Penalty Impact:</span>
                              <p className="font-bold text-teal">
                                {p.factor_breakdown?.rating_contribution?.toFixed(1) ?? '15.0'} pts
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: OPPORTUNITY MATRIX SCATTER */}
      <div className="card-editorial space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone/50 pb-3">
          <div>
            <span className="section-label">2D Prioritization Matrix</span>
            <h3 className="font-display text-xl text-pine font-semibold">
              Product Opportunity Grid
            </h3>
            <p className="text-xs text-graphite font-body">
              Correlates Pain Index (Y-axis) against Engineering Implementation Effort (X-axis).
              Click any bubble to modify effort score.
            </p>
          </div>
        </div>

        <BubbleMatrix
          data={matrixList}
          onSelectBubble={(item) => {
            setEditingItem(item)
            setTempEffort(item.effort_estimate)
          }}
        />

        <div className="p-3 bg-ivory/50 rounded-xl border border-stone/60 text-xs text-graphite font-mono">
          <strong>Strategic Disclaimer:</strong> Implementation effort estimates are analyst-configured
          weights. This matrix serves as an academic prioritization mechanism rather than an automated business forecast.
        </div>
      </div>

      {/* Effort Editing Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pine/50">
          <div className="bg-white border border-stone rounded-2xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <span className="section-label">Analyst Effort Calibrator</span>
            <h4 className="font-display text-lg font-semibold text-pine">
              Calibrate Effort: {editingItem.aspect}
            </h4>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-graphite">Complexity Score (1 Low to 10 High):</span>
                <span className="text-teal font-bold">{tempEffort} / 10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={tempEffort}
                onChange={(e) => setTempEffort(Number(e.target.value))}
                className="w-full accent-teal"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone/50">
              <button onClick={() => setEditingItem(null)} className="btn-ghost text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  effortMutation.mutate({ aspect: editingItem.aspect, effort: tempEffort })
                }
                disabled={effortMutation.isPending}
                className="btn-primary text-xs"
              >
                {effortMutation.isPending ? 'Saving...' : 'Update Matrix Position'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default Opportunities
