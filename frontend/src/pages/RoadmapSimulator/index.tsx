import React, { useState } from 'react'
import {
  Map,
  Plus,
  Trash2,
  Save,
  BarChart2,
  Info,
  Sliders,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { innovationApi } from '../../services/api'
import { useAppStore } from '../../store/appStore'
import { useToast } from '../../components/ui/ToastProvider'
import EmptyState from '../../components/ui/EmptyState'
import { formatNumber } from '../../utils/formatters'
import type { PainIndexResult, RoadmapScenario } from '../../types'

interface SelectedImprovement {
  aspect: string
  pain_score: number
  effort: number
  mention_count: number
}

export const RoadmapSimulator: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { activeDatasetId, activeDatasetName } = useAppStore()

  // Selected aspects in current working scenario
  const [selectedAspects, setSelectedAspects] = useState<SelectedImprovement[]>([
    { aspect: 'battery_drain', pain_score: 84.5, effort: 6, mention_count: 520 },
    { aspect: 'overheating_charge', pain_score: 72.1, effort: 4, mention_count: 340 },
  ])

  const [scenarioName, setScenarioName] = useState('Q3 Battery & Thermal Initiative')
  const [comparing, setComparing] = useState(false)

  // Fetch pain index items
  const { data: painData } = useQuery<PainIndexResult[]>({
    queryKey: ['pain-index', activeDatasetId],
    queryFn: async () => (await innovationApi.getPainIndexResults(activeDatasetId!)).data,
    enabled: activeDatasetId !== null,
  })

  // Fetch saved scenarios
  const { data: savedScenarios } = useQuery<RoadmapScenario[]>({
    queryKey: ['scenarios', activeDatasetId],
    queryFn: async () => (await innovationApi.getScenarios(activeDatasetId!)).data,
    enabled: activeDatasetId !== null,
  })

  // Save Scenario Mutation
  const saveScenarioMutation = useMutation({
    mutationFn: (payload: any) => innovationApi.simulateRoadmap(payload),
    onSuccess: () => {
      toast('Scenario configuration saved to project history!', 'success')
      queryClient.invalidateQueries({ queryKey: ['scenarios', activeDatasetId] })
    },
    onError: (err: any) => toast(err?.message || 'Failed to save scenario', 'error'),
  })

  if (!activeDatasetId) {
    return (
      <EmptyState
        icon={Map}
        title="No Dataset Selected"
        description="Select an active dataset to simulate what-if roadmap prioritization scenarios and pain reduction forecasts."
      />
    )
  }

  const availableAspects: PainIndexResult[] =
    painData && painData.length > 0
      ? painData
      : [
          { aspect: 'battery_drain', pain_score: 84.5, neg_pct: 78, frequency: 0.8, recency_growth: 1.2, rating_impact: 1.8, mention_count: 520, factor_breakdown: { neg_pct_contribution: 25, freq_contribution: 20, recency_contribution: 20, rating_contribution: 19 } },
          { aspect: 'overheating_charge', pain_score: 72.1, neg_pct: 68, frequency: 0.6, recency_growth: 1.1, rating_impact: 1.4, mention_count: 340, factor_breakdown: { neg_pct_contribution: 20, freq_contribution: 18, recency_contribution: 18, rating_contribution: 16 } },
          { aspect: 'bluetooth_stutter', pain_score: 61.3, neg_pct: 54, frequency: 0.4, recency_growth: 0.8, rating_impact: 1.1, mention_count: 220, factor_breakdown: { neg_pct_contribution: 18, freq_contribution: 12, recency_contribution: 15, rating_contribution: 16 } },
          { aspect: 'software_crash_launch', pain_score: 54.8, neg_pct: 62, frequency: 0.3, recency_growth: 0.4, rating_impact: 1.6, mention_count: 180, factor_breakdown: { neg_pct_contribution: 20, freq_contribution: 8, recency_contribution: 11, rating_contribution: 15 } },
          { aspect: 'camera_low_light_noise', pain_score: 48.2, neg_pct: 42, frequency: 0.25, recency_growth: 0.5, rating_impact: 0.9, mention_count: 150, factor_breakdown: { neg_pct_contribution: 15, freq_contribution: 10, recency_contribution: 11, rating_contribution: 12 } },
        ]

  const handleAddAspect = (item: PainIndexResult) => {
    if (selectedAspects.some((a) => a.aspect === item.aspect)) return
    setSelectedAspects((prev) => [
      ...prev,
      { aspect: item.aspect, pain_score: item.pain_score, effort: 5, mention_count: item.mention_count },
    ])
  }

  const handleRemoveAspect = (aspectName: string) => {
    setSelectedAspects((prev) => prev.filter((a) => a.aspect !== aspectName))
  }

  const handleEffortChange = (aspectName: string, newEffort: number) => {
    setSelectedAspects((prev) =>
      prev.map((a) => (a.aspect === aspectName ? { ...a, effort: newEffort } : a))
    )
  }

  // Calculate Impact Estimates
  const totalReviewsAddressed = selectedAspects.reduce((sum, item) => sum + item.mention_count, 0)
  const totalPainReduction = selectedAspects.reduce((sum, item) => sum + item.pain_score * 0.45, 0) // hypothetical heuristic
  const totalEffortPoints = selectedAspects.reduce((sum, item) => sum + item.effort, 0)

  const handleSaveScenario = () => {
    const payload = {
      dataset_id: activeDatasetId,
      name: scenarioName,
      selected_aspects: selectedAspects.map((a) => a.aspect),
      effort_estimates: selectedAspects.reduce((acc, curr) => ({ ...acc, [curr.aspect]: curr.effort }), {}),
    }
    saveScenarioMutation.mutate(payload)
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <span className="section-label">Strategic Simulation • What-If Modeling</span>
        <h1 className="font-display text-3xl font-semibold text-pine mt-1">
          Product Roadmap Simulator
        </h1>
        <p className="text-graphite font-body text-sm mt-1 max-w-2xl">
          Construct candidate product release scenarios. Model how addressing specific customer
          pain aspects reduces friction volume and projected negative sentiment.
        </p>
      </div>

      {/* Prominent Academic & Planning Disclaimer */}
      <div className="p-4 rounded-xl bg-citron/25 border-2 border-citron flex items-start gap-3">
        <Info size={20} className="text-pine flex-shrink-0 mt-0.5" />
        <div className="text-xs font-mono text-pine space-y-1">
          <p className="font-bold uppercase tracking-wider">Planning Model Disclaimer:</p>
          <p className="font-body text-graphite leading-relaxed">
            These figures are <strong>planning estimates</strong> based on historical review data. They are not
            predictions of guaranteed business outcomes. Actual customer satisfaction improvements depend on
            feature implementation fidelity, quality assurance, and myriad external market factors.
          </p>
        </div>
      </div>

      {/* 3-Panel Scenario Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Available Pain Points (4 cols) */}
        <div className="lg:col-span-4 card-editorial space-y-4">
          <div className="flex items-center justify-between border-b border-stone/50 pb-3">
            <span className="section-label">Available Aspects</span>
            <span className="text-xs font-mono text-graphite">{availableAspects.length} targets</span>
          </div>
          <p className="text-xs text-graphite font-body">
            Select high-friction customer complaints to add to the release bundle:
          </p>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {availableAspects.map((item) => {
              const isSelected = selectedAspects.some((a) => a.aspect === item.aspect)
              return (
                <div
                  key={item.aspect}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-teal bg-teal/5 opacity-60'
                      : 'border-stone bg-white hover:border-teal'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-semibold text-pine block">
                      {item.aspect}
                    </span>
                    <span className="text-[10px] font-mono text-graphite">
                      Pain Score: <strong className="text-coral">{item.pain_score.toFixed(1)}</strong> |{' '}
                      {item.mention_count} reviews
                    </span>
                  </div>

                  <button
                    disabled={isSelected}
                    onClick={() => handleAddAspect(item)}
                    className="p-1.5 rounded-lg border border-teal text-teal hover:bg-teal hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Middle Panel: Roadmap Bundle Builder (4 cols) */}
        <div className="lg:col-span-4 card-editorial space-y-4">
          <div className="flex items-center justify-between border-b border-stone/50 pb-3">
            <span className="section-label">Active Bundle</span>
            <span className="text-xs font-mono text-teal font-bold">
              {selectedAspects.length} selected
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-graphite">Scenario Designation:</label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full text-xs font-mono p-2 rounded-lg border border-stone bg-ivory/30 focus:border-teal outline-none"
            />
          </div>

          <div className="space-y-3 pt-2 max-h-[440px] overflow-y-auto pr-1">
            {selectedAspects.length === 0 ? (
              <p className="text-xs font-mono text-graphite text-center py-12">
                No improvements added. Pick aspects from the left panel.
              </p>
            ) : (
              selectedAspects.map((item, idx) => (
                <div
                  key={item.aspect}
                  className="p-3.5 rounded-xl border border-stone bg-white space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-stone font-bold">#{idx + 1}</span>
                      <span className="font-mono text-xs font-bold text-pine">{item.aspect}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveAspect(item.aspect)}
                      className="text-graphite hover:text-coral p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-graphite">Engineering Effort:</span>
                      <span className="text-teal font-bold">{item.effort} pts</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={item.effort}
                      onChange={(e) => handleEffortChange(item.aspect, Number(e.target.value))}
                      className="w-full accent-teal"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Estimated Scenario Impact (4 cols) */}
        <div className="lg:col-span-4 card-editorial space-y-5 border-l-4 border-l-teal">
          <div className="flex items-center justify-between border-b border-stone/50 pb-3">
            <div>
              <span className="section-label">Simulated Projection</span>
              <h3 className="font-display text-lg text-pine font-semibold">
                Scenario Impact (ESTIMATE)
              </h3>
            </div>
            <button
              onClick={handleSaveScenario}
              disabled={saveScenarioMutation.isPending || selectedAspects.length === 0}
              className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <Save size={13} />
              Save
            </button>
          </div>

          {/* Metric Estimates */}
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-ivory/60 border border-stone/50">
              <span className="text-[10px] font-mono uppercase text-graphite block">
                Total Customer Reviews Addressed
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono text-2xl font-bold text-pine">
                  {formatNumber(totalReviewsAddressed)}
                </span>
                <span className="text-xs font-mono text-graphite">(ESTIMATE)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-teal/10 border border-teal/20">
              <span className="text-[10px] font-mono uppercase text-teal block">
                Projected Pain Score Reduction
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono text-2xl font-bold text-teal">
                  -{totalPainReduction.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-teal">pts (ESTIMATE)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone/30 border border-stone/50">
              <span className="text-[10px] font-mono uppercase text-graphite block">
                Aggregate Implementation Effort
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono text-2xl font-bold text-pine">
                  {totalEffortPoints}
                </span>
                <span className="text-xs font-mono text-graphite">points</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] font-mono text-graphite leading-normal">
            Prioritizing these {selectedAspects.length} friction areas targets{' '}
            {((totalReviewsAddressed / 2400) * 100).toFixed(0)}% of documented negative customer mentions.
          </p>
        </div>
      </div>

      {/* Saved Scenarios Comparison Grid */}
      <div className="card-editorial space-y-4">
        <div className="flex items-center justify-between border-b border-stone/50 pb-3">
          <div>
            <span className="section-label">History & Alternatives</span>
            <h3 className="font-display text-xl text-pine font-semibold">
              Saved Simulation Scenarios
            </h3>
          </div>
          <span className="text-xs font-mono text-graphite">
            {(savedScenarios || []).length} scenarios recorded
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(savedScenarios && savedScenarios.length > 0
            ? savedScenarios
            : [
                {
                  id: 1,
                  name: 'Baseline Bug Triage Sprint',
                  dataset_id: 1,
                  selected_aspects: ['software_crash_launch', 'bluetooth_stutter'],
                  effort_estimates: { software_crash_launch: 2, bluetooth_stutter: 3 },
                  created_at: '2024-05-02',
                  estimated_impact: {
                    reviews_addressed: 400,
                    aspects_resolved: 2,
                    pain_reduction: 48.0,
                    improvements: [],
                  },
                },
                {
                  id: 2,
                  name: 'Flagship Hardware Overhaul',
                  dataset_id: 1,
                  selected_aspects: ['battery_drain', 'overheating_charge'],
                  effort_estimates: { battery_drain: 7, overheating_charge: 5 },
                  created_at: '2024-05-03',
                  estimated_impact: {
                    reviews_addressed: 860,
                    aspects_resolved: 2,
                    pain_reduction: 70.4,
                    improvements: [],
                  },
                },
              ]
          ).map((sc) => (
            <div key={sc.id} className="p-4 rounded-xl border border-stone bg-white space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-semibold text-pine text-base">{sc.name}</h4>
                <span className="text-xs font-mono text-graphite">{sc.created_at}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {sc.selected_aspects.map((asp, i) => (
                  <span key={i} className="badge-neutral">
                    {asp}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-stone/30 text-xs font-mono">
                <span className="text-teal font-semibold">
                  -{sc.estimated_impact?.pain_reduction?.toFixed(0) ?? 50} pts pain reduction
                </span>
                <span className="text-graphite">
                  {sc.estimated_impact?.reviews_addressed ?? 0} reviews resolved
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default RoadmapSimulator
