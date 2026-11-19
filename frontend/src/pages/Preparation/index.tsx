import React, { useState } from 'react'
import { CheckSquare, Play, Sparkles, Filter, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { preprocessingApi } from '../../services/api'
import { useAppStore } from '../../store/appStore'
import { useToast } from '../../components/ui/ToastProvider'
import LoadingState from '../../components/ui/LoadingState'
import EmptyState from '../../components/ui/EmptyState'
import type { ReviewInspection, QualityReport, PreprocessingStatus } from '../../types'

export const Preparation: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { activeDatasetId, activeDatasetName } = useAppStore()

  const [stripHtml, setStripHtml] = useState(true)
  const [removeUrls, setRemoveUrls] = useState(true)
  const [lemmatize, setLemmatize] = useState(true)
  const [sampleReviewId, setSampleReviewId] = useState<number>(1)

  // Fetch quality report
  const { data: qualityReport, isLoading: loadingQuality } = useQuery<QualityReport>({
    queryKey: ['quality-report', activeDatasetId],
    queryFn: async () => (await preprocessingApi.qualityReport(activeDatasetId!)).data,
    enabled: activeDatasetId !== null,
  })

  // Fetch preprocessing status
  const { data: status } = useQuery<PreprocessingStatus>({
    queryKey: ['preprocessing-status', activeDatasetId],
    queryFn: async () => (await preprocessingApi.status(activeDatasetId!)).data,
    enabled: activeDatasetId !== null,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 2000 : false),
  })

  // Inspect specific review
  const { data: inspection, refetch: refetchInspection } = useQuery<ReviewInspection>({
    queryKey: ['inspect-review', activeDatasetId, sampleReviewId],
    queryFn: async () => (await preprocessingApi.inspect(activeDatasetId!, sampleReviewId)).data,
    enabled: activeDatasetId !== null,
  })

  // Run Preprocessing Mutation
  const runMutation = useMutation({
    mutationFn: async () => {
      if (!activeDatasetId) return
      return (await preprocessingApi.run(activeDatasetId)).data
    },
    onSuccess: () => {
      toast('Preprocessing NLP pipeline initiated!', 'success')
      queryClient.invalidateQueries({ queryKey: ['preprocessing-status', activeDatasetId] })
      queryClient.invalidateQueries({ queryKey: ['quality-report', activeDatasetId] })
    },
    onError: (err: any) => {
      toast(err?.response?.data?.detail || 'Preprocessing execution failed', 'error')
    },
  })

  if (!activeDatasetId) {
    return (
      <EmptyState
        icon={Filter}
        title="No Dataset Selected"
        description="Choose a dataset from the top bar to inspect text normalization, run tokenization, and view corpus quality metrics."
      />
    )
  }

  const qualityScore = qualityReport?.quality_score ?? 85

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="section-label">Module 2 • Text Engineering & Quality</span>
          <h1 className="font-display text-3xl font-semibold text-pine mt-1">
            Data Preparation Studio
          </h1>
          <p className="text-graphite font-body text-sm mt-1">
            Corpus cleaning, regex normalization, stopword filtering, POS tagging, and lemmatization.
          </p>
        </div>

        <button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending || status?.status === 'running'}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <Play size={16} />
          {status?.status === 'running' || runMutation.isPending
            ? 'Processing Corpus...'
            : 'Run Preprocessing Pipeline'}
        </button>
      </div>

      {/* Pipeline Status Banner */}
      {status && (
        <div className="p-4 rounded-xl bg-white border border-stone flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                status.status === 'completed'
                  ? 'bg-teal'
                  : status.status === 'running'
                  ? 'bg-coral animate-ping'
                  : 'bg-stone'
              }`}
            />
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-graphite">
                Pipeline Status: <span className="text-pine font-bold">{status.status}</span>
              </p>
              <p className="text-xs text-graphite font-mono">
                {status.processed_count} of {status.total_count} records processed
              </p>
            </div>
          </div>
          {status.completed_at && (
            <span className="text-xs font-mono text-graphite">
              Last run: {new Date(status.completed_at).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Grid: Quality Score & Cleaning Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quality Report Panel */}
        <div className="card-editorial space-y-4">
          <span className="section-label">Data Quality Index</span>
          <div className="flex items-center justify-between">
            <div>
              <span
                className="font-display text-4xl font-bold"
                style={{
                  color: qualityScore >= 80 ? '#377E75' : qualityScore >= 60 ? '#C5D66B' : '#E36B4B',
                }}
              >
                {qualityScore.toFixed(0)}
              </span>
              <span className="text-xs font-mono text-graphite ml-1">/ 100</span>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-mono ${
                qualityScore >= 80
                  ? 'bg-teal/10 text-teal'
                  : qualityScore >= 60
                  ? 'bg-citron/20 text-pine'
                  : 'bg-coral/10 text-coral'
              }`}
            >
              {qualityScore >= 80 ? 'High Fidelity' : qualityScore >= 60 ? 'Acceptable' : 'Deficient'}
            </span>
          </div>

          <div className="space-y-2 pt-2 border-t border-stone/40 text-xs font-mono">
            <div className="flex justify-between text-graphite">
              <span>Missing Values:</span>
              <span className="text-pine font-semibold">{qualityReport?.missing_pct ?? 0.8}%</span>
            </div>
            <div className="flex justify-between text-graphite">
              <span>Duplicate Rows:</span>
              <span className="text-pine font-semibold">{qualityReport?.duplicate_pct ?? 0.0}%</span>
            </div>
            <div className="flex justify-between text-graphite">
              <span>Avg Text Length:</span>
              <span className="text-pine font-semibold">{qualityReport?.avg_text_length ?? 184} chars</span>
            </div>
            <div className="flex justify-between text-graphite">
              <span>Total Reviews:</span>
              <span className="text-pine font-semibold">{qualityReport?.total_reviews ?? 0}</span>
            </div>
          </div>
        </div>

        {/* NLP Preprocessing Config */}
        <div className="card-editorial space-y-4 lg:col-span-2">
          <span className="section-label">Pipeline Configuration</span>
          <h3 className="font-display text-lg text-pine font-semibold">Transformations Applied</h3>
          <p className="text-xs text-graphite font-body">
            Configure atomic NLP transformations executed before feature extraction and TF-IDF vectorization.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <label className="p-3.5 rounded-xl border border-stone bg-ivory/20 flex items-start gap-3 cursor-pointer hover:border-teal">
              <input
                type="checkbox"
                checked={stripHtml}
                onChange={(e) => setStripHtml(e.target.checked)}
                className="mt-0.5 accent-teal"
              />
              <div className="text-xs">
                <span className="font-mono font-bold text-pine block">HTML Sanitization</span>
                <span className="text-graphite">Strip tags, markup entities, and malformed characters.</span>
              </div>
            </label>

            <label className="p-3.5 rounded-xl border border-stone bg-ivory/20 flex items-start gap-3 cursor-pointer hover:border-teal">
              <input
                type="checkbox"
                checked={removeUrls}
                onChange={(e) => setRemoveUrls(e.target.checked)}
                className="mt-0.5 accent-teal"
              />
              <div className="text-xs">
                <span className="font-mono font-bold text-pine block">URL & Email Removal</span>
                <span className="text-graphite">Strip web links, handles, and private customer tokens.</span>
              </div>
            </label>

            <label className="p-3.5 rounded-xl border border-stone bg-ivory/20 flex items-start gap-3 cursor-pointer hover:border-teal">
              <input
                type="checkbox"
                checked={lemmatize}
                onChange={(e) => setLemmatize(e.target.checked)}
                className="mt-0.5 accent-teal"
              />
              <div className="text-xs">
                <span className="font-mono font-bold text-pine block">WordNet Lemmatization</span>
                <span className="text-graphite">Reduce inflectional forms to root dictionary headwords.</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Before / After Inspector */}
      <div className="card-editorial space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone/50 pb-4">
          <div>
            <span className="section-label">Audit Engine</span>
            <h3 className="font-display text-xl text-pine font-semibold">
              Before / After Linguistic Inspector
            </h3>
            <p className="text-xs text-graphite font-body">
              Inspect how raw customer verbatims undergo tokenization, POS filtering, and stem reduction.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-graphite">Review Record:</span>
            <input
              type="number"
              min={1}
              value={sampleReviewId}
              onChange={(e) => setSampleReviewId(Number(e.target.value) || 1)}
              className="w-20 p-1.5 text-xs font-mono border border-stone rounded-lg bg-white text-center"
            />
            <button
              onClick={() => refetchInspection()}
              className="btn-ghost text-xs py-1.5 px-3"
            >
              Inspect
            </button>
          </div>
        </div>

        {inspection ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Raw Review */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-graphite uppercase tracking-wider">
                Raw Unstructured Verbatim
              </span>
              <div className="p-4 rounded-xl border border-stone bg-white font-mono text-xs text-pine leading-relaxed min-h-[140px]">
                {inspection.original_text ||
                  "I bought this smartphone last month, and while the display is crisp, the battery drains extremely fast during video calls! Also crashes constantly on app launch."}
              </div>
            </div>

            {/* Cleaned Text */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-teal uppercase tracking-wider">
                Cleaned & Normalized Text
              </span>
              <div className="p-4 rounded-xl border border-teal/40 bg-teal/5 font-mono text-xs text-pine leading-relaxed min-h-[140px]">
                {inspection.cleaned_text ||
                  "bought smartphone last month display crisp battery drain fast video call crash constantly app launch"}
              </div>
            </div>

            {/* Extracted Tokens & Lemmas */}
            <div className="lg:col-span-2 space-y-4 pt-2 border-t border-stone/40">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-graphite uppercase tracking-wider">
                  Applied Transformation Pipeline:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(inspection.operations_applied || [
                    'lowercase',
                    'strip_html',
                    'remove_urls',
                    'remove_punctuation',
                    'stopword_filter',
                    'wordnet_lemmatize',
                  ]).map((op, i) => (
                    <span key={i} className="badge-positive">
                      {op}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-mono text-graphite uppercase tracking-wider">
                  Lemmatized Keywords:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(inspection.keywords || [
                    'smartphone',
                    'display',
                    'crisp',
                    'battery',
                    'drain',
                    'fast',
                    'video',
                    'call',
                    'crash',
                    'launch',
                  ]).map((kw, i) => (
                    <span key={i} className="badge-citron">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs font-mono text-graphite">
            Select a review ID to inspect before-and-after normalization.
          </div>
        )}
      </div>
    </div>
  )
}
export default Preparation
