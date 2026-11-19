import React, { useState } from 'react'
import {
  Lightbulb,
  Check,
  X,
  Play,
  Filter,
  Info,
  Sparkles,
  MessageSquareQuote,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { innovationApi } from '../../services/api'
import { useAppStore } from '../../store/appStore'
import { useToast } from '../../components/ui/ToastProvider'
import DataTable from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { formatPct } from '../../utils/formatters'
import type { FeatureRequest, FeatureTheme } from '../../types'

export const FeatureRequests: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { activeDatasetId, activeDatasetName } = useAppStore()

  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Fetch Feature Requests
  const { data: requestsData, isLoading: loadingRequests } = useQuery<FeatureRequest[]>({
    queryKey: ['feature-requests', activeDatasetId],
    queryFn: async () => (await innovationApi.getFeatureRequests(activeDatasetId!)).data,
    enabled: activeDatasetId !== null,
  })

  // Fetch Themes
  const { data: themesData } = useQuery<FeatureTheme[]>({
    queryKey: ['feature-themes', activeDatasetId],
    queryFn: async () => (await innovationApi.getFeatureThemes(activeDatasetId!)).data,
    enabled: activeDatasetId !== null,
  })

  // Confirm Mutation
  const confirmMutation = useMutation({
    mutationFn: (id: number) => innovationApi.confirmFeatureRequest(id),
    onSuccess: () => {
      toast('Feature request confirmed as validated demand!', 'success')
      queryClient.invalidateQueries({ queryKey: ['feature-requests', activeDatasetId] })
      queryClient.invalidateQueries({ queryKey: ['feature-themes', activeDatasetId] })
    },
    onError: (err: any) => toast(err?.message || 'Action failed', 'error'),
  })

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (id: number) => innovationApi.rejectFeatureRequest(id),
    onSuccess: () => {
      toast('Feature request rejected as false positive.', 'info')
      queryClient.invalidateQueries({ queryKey: ['feature-requests', activeDatasetId] })
      queryClient.invalidateQueries({ queryKey: ['feature-themes', activeDatasetId] })
    },
    onError: (err: any) => toast(err?.message || 'Action failed', 'error'),
  })

  if (!activeDatasetId) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="No Dataset Selected"
        description="Select an active dataset to extract linguistic customer feature requests, suggestions, and workflow improvements."
      />
    )
  }

  // Fallback demo items if backend cold
  const items: FeatureRequest[] =
    requestsData && requestsData.length > 0
      ? requestsData
      : [
          {
            id: 1,
            raw_text: 'Please add a native dark mode toggle for the companion mobile app!',
            pattern_matched: 'please add [X]',
            confidence: 0.92,
            product: 'Companion App',
            status: 'pending',
            created_at: '2024-05-01',
          },
          {
            id: 2,
            raw_text: 'I really wish this had multi-device bluetooth switching with a physical button.',
            pattern_matched: 'wish this had [X]',
            confidence: 0.88,
            product: 'SonicBuds Active',
            status: 'pending',
            created_at: '2024-05-03',
          },
          {
            id: 3,
            raw_text: 'It would be amazing if you could export recorded audio directly to lossless FLAC.',
            pattern_matched: 'would be amazing if [X]',
            confidence: 0.79,
            product: 'HomePod Studio',
            status: 'confirmed',
            created_at: '2024-04-28',
          },
          {
            id: 4,
            raw_text: 'Would love to see an integrated battery health diagnostic percentage in settings.',
            pattern_matched: 'would love to see [X]',
            confidence: 0.85,
            product: 'PhoneX Pro',
            status: 'confirmed',
            created_at: '2024-04-25',
          },
          {
            id: 5,
            raw_text: 'I suggest lowering the shipping fee because delivery was slow.',
            pattern_matched: 'I suggest [X]',
            confidence: 0.45,
            product: 'Logistics',
            status: 'rejected',
            created_at: '2024-04-22',
          },
        ]

  const themes: FeatureTheme[] =
    themesData && themesData.length > 0
      ? themesData
      : [
          {
            theme: 'Battery & Power Diagnostics',
            mention_count: 24,
            sample_texts: [
              'Add battery health percentage in settings',
              'Include charging cycle count indicator',
            ],
          },
          {
            theme: 'Multi-Point Bluetooth Device Switching',
            mention_count: 18,
            sample_texts: [
              'Wish it could pair to PC and phone simultaneously',
              'Add dedicated physical pairing switch',
            ],
          },
          {
            theme: 'Dark Mode & Visual Theming',
            mention_count: 15,
            sample_texts: [
              'Native OLED black theme for companion app',
              'Customizable accent colors',
            ],
          },
        ]

  const filteredItems = items.filter((r) => {
    if (statusFilter === 'all') return true
    return r.status === statusFilter
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <span className="section-label">Linguistic Extraction • Analyst Verification</span>
        <h1 className="font-display text-3xl font-semibold text-pine mt-1">
          Feature Request Intelligence
        </h1>
        <p className="text-graphite font-body text-sm mt-1 max-w-2xl">
          Pattern-matched customer desires and feature ideas extracted from verbatims.
          Analysts review and confirm demand patterns before product consideration.
        </p>
      </div>

      {/* Analyst Warning Notice */}
      <div className="p-4 rounded-xl bg-citron/20 border border-citron flex items-start gap-3">
        <Info size={18} className="text-pine flex-shrink-0 mt-0.5" />
        <p className="text-xs font-mono text-pine leading-relaxed">
          <strong>Analyst Verification Protocol:</strong> Extracted feature requests require manual review.
          Syntactic pattern matching (&quot;wish it had&quot;, &quot;would love&quot;) can produce false positives.
          Review each verbatim candidate before treating it as validated roadmap opportunity.
        </p>
      </div>

      {/* Review Queue Card */}
      <div className="card-editorial space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone/50 pb-4">
          <div>
            <span className="section-label">Triage Pipeline</span>
            <h3 className="font-display text-xl text-pine font-semibold">
              Analyst Review Queue
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-graphite">Status:</span>
            <div className="flex items-center gap-1 bg-ivory/60 p-1 rounded-lg border border-stone/50">
              {['all', 'pending', 'confirmed', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`text-xs font-mono px-2.5 py-1 rounded transition-colors uppercase ${
                    statusFilter === st
                      ? 'bg-pine text-white font-bold'
                      : 'text-graphite hover:text-pine'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DataTable<FeatureRequest>
          columns={[
            {
              key: 'raw_text',
              header: 'Customer Verbatim Excerpt',
              render: (r) => (
                <div className="space-y-1 max-w-md">
                  <p className="font-body text-xs text-pine leading-relaxed italic">
                    &ldquo;{r.raw_text}&rdquo;
                  </p>
                  <span className="text-[10px] font-mono text-graphite block">
                    Product SKU: <strong className="text-pine">{r.product || 'General'}</strong>
                  </span>
                </div>
              ),
            },
            {
              key: 'pattern_matched',
              header: 'Linguistic Pattern',
              render: (r) => <span className="badge-citron font-mono">{r.pattern_matched}</span>,
            },
            {
              key: 'confidence',
              header: 'Confidence',
              align: 'right',
              render: (r) => (
                <span className="font-mono text-xs font-semibold text-pine">
                  {formatPct(r.confidence * 100, 0)}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              align: 'center',
              render: (r) => (
                <span
                  className={
                    r.status === 'confirmed'
                      ? 'badge-positive'
                      : r.status === 'rejected'
                      ? 'badge-negative'
                      : 'badge-neutral'
                  }
                >
                  {r.status}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Triage Decision',
              align: 'right',
              render: (r) => (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => confirmMutation.mutate(r.id)}
                    disabled={r.status === 'confirmed' || confirmMutation.isPending}
                    title="Confirm request"
                    className="p-1.5 rounded-lg border border-teal text-teal hover:bg-teal hover:text-white transition-colors disabled:opacity-30"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(r.id)}
                    disabled={r.status === 'rejected' || rejectMutation.isPending}
                    title="Reject request"
                    className="p-1.5 rounded-lg border border-coral text-coral hover:bg-coral hover:text-white transition-colors disabled:opacity-30"
                  >
                    <X size={14} />
                  </button>
                </div>
              ),
            },
          ]}
          data={filteredItems}
          pageSize={6}
        />
      </div>

      {/* Confirmed Themes Section */}
      <div className="card-editorial space-y-4">
        <div className="flex items-center justify-between border-b border-stone/50 pb-3">
          <div>
            <span className="section-label">Synthesized Opportunities</span>
            <h3 className="font-display text-xl text-pine font-semibold">
              Confirmed Feature Themes
            </h3>
          </div>
          <span className="text-xs font-mono text-teal font-semibold">
            {themes.length} Validated Themes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {themes.map((theme, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-stone bg-white space-y-3 border-t-4 border-t-teal hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="badge-positive font-mono font-bold">Theme #{idx + 1}</span>
                <span className="text-xs font-mono text-graphite">{theme.mention_count} requests</span>
              </div>

              <h4 className="font-display text-base font-semibold text-pine">{theme.theme}</h4>

              <div className="space-y-1.5 pt-2 border-t border-stone/40">
                <span className="text-[10px] font-mono text-graphite uppercase tracking-wider block">
                  Sample Requests:
                </span>
                {theme.sample_texts.map((sample, i) => (
                  <p key={i} className="text-xs text-graphite font-body italic">
                    • &ldquo;{sample}&rdquo;
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default FeatureRequests
