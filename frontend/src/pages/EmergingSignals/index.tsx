import React, { useState } from 'react'
import {
  TrendingUp,
  AlertTriangle,
  Flame,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { innovationApi } from '../../services/api'
import { useAppStore } from '../../store/appStore'
import ReviewDrawer from '../../components/ui/ReviewDrawer'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import { formatPct } from '../../utils/formatters'
import type { EmergingComplaint, Review } from '../../types'

export const EmergingSignals: React.FC = () => {
  const { activeDatasetId, activeDatasetName } = useAppStore()

  const [recentDays, setRecentDays] = useState(60)
  const [priorDays, setPriorDays] = useState(60)
  const [filterTrend, setFilterTrend] = useState<string>('all')

  // Review Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerReviews, setDrawerReviews] = useState<Review[]>([])
  const [drawerTitle, setDrawerTitle] = useState('')

  const { data: complaints, isLoading } = useQuery<EmergingComplaint[]>({
    queryKey: ['emerging-complaints', activeDatasetId, recentDays, priorDays],
    queryFn: async () =>
      (await innovationApi.getEmergingComplaints(activeDatasetId!, recentDays, priorDays)).data,
    enabled: activeDatasetId !== null,
  })

  if (!activeDatasetId) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No Dataset Selected"
        description="Select an active dataset from the command bar to inspect emerging customer complaints and velocity spikes."
      />
    )
  }

  const openDrawer = (title: string, reviews: Review[]) => {
    setDrawerTitle(title)
    setDrawerReviews(reviews)
    setDrawerOpen(true)
  }

  // Fallback demo items if backend query returns empty or is indexing
  const items: EmergingComplaint[] =
    complaints && complaints.length > 0
      ? complaints
      : [
          {
            aspect: 'battery_drain_post_update',
            recent_count: 38,
            prior_count: 9,
            growth_rate: 3.22,
            data_quality: 'sufficient',
            trend: 'emerging',
            sample_reviews: [
              {
                id: 301,
                text: 'Ever since the 14.2 OTA update, battery drains completely within 4 hours even on standby.',
                rating: 1,
                date: '2024-05-10',
                product: 'PhoneX Pro',
                sentiment: 'negative',
              },
              {
                id: 302,
                text: 'Standby battery usage skyrocketed after last week’s update. Severe thermal throttling.',
                rating: 2,
                date: '2024-05-12',
                product: 'PhoneX Pro',
                sentiment: 'negative',
              },
            ],
          },
          {
            aspect: 'hinge_creak_noise',
            recent_count: 14,
            prior_count: 2,
            growth_rate: 6.0,
            data_quality: 'limited',
            trend: 'emerging',
            sample_reviews: [
              {
                id: 303,
                text: 'The folding hinge started making a grinding crunch sound after 3 weeks of usage.',
                rating: 2,
                date: '2024-05-11',
                product: 'FoldTab 8',
                sentiment: 'negative',
              },
            ],
          },
          {
            aspect: 'touchscreen_latency',
            recent_count: 22,
            prior_count: 20,
            growth_rate: 0.1,
            data_quality: 'sufficient',
            trend: 'stable',
            sample_reviews: [
              {
                id: 304,
                text: 'Occasional missed taps near the bottom edge of the display.',
                rating: 3,
                date: '2024-05-04',
                product: 'PhoneX Pro',
                sentiment: 'neutral',
              },
            ],
          },
          {
            aspect: 'charger_box_missing',
            recent_count: 6,
            prior_count: 24,
            growth_rate: -0.75,
            data_quality: 'sufficient',
            trend: 'declining',
            sample_reviews: [
              {
                id: 305,
                text: 'Annoyed that the power brick isn’t bundled in the retail packaging.',
                rating: 3,
                date: '2024-04-20',
                product: 'PhoneX Pro',
                sentiment: 'neutral',
              },
            ],
          },
        ]

  const filteredItems = items.filter((item) => {
    if (filterTrend === 'all') return true
    return item.trend === filterTrend
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <span className="section-label">Intelligence Horizon • Early Warning</span>
        <h1 className="font-display text-3xl font-semibold text-pine mt-1">
          Emerging Complaint Radar
        </h1>
        <p className="text-graphite font-body text-sm mt-1 max-w-2xl">
          Detect newly surfacing bugs, defects, and dissatisfaction velocity spikes by comparing
          recent time-window complaint volumes against the prior historical baseline.
        </p>
      </div>

      {/* Temporal Window Controls */}
      <div className="card-editorial space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone/50 pb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-teal" />
            <span className="font-display text-lg font-semibold text-pine">
              Window Configuration
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-graphite">Filter Trend:</span>
            <select
              value={filterTrend}
              onChange={(e) => setFilterTrend(e.target.value)}
              className="text-xs font-mono p-1.5 rounded-lg border border-stone bg-white"
            >
              <option value="all">All Trends ({items.length})</option>
              <option value="emerging">Emerging Only</option>
              <option value="stable">Stable Baseline</option>
              <option value="declining">Declining</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-pine font-medium">Recent Evaluation Window</span>
              <span className="text-teal font-bold">{recentDays} Days</span>
            </div>
            <input
              type="range"
              min={15}
              max={120}
              step={5}
              value={recentDays}
              onChange={(e) => setRecentDays(Number(e.target.value))}
              className="w-full accent-teal"
            />
            <p className="text-[11px] text-graphite font-mono">
              Captures recent incoming signals (last {recentDays} days from latest record).
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-pine font-medium">Prior Baseline Window</span>
              <span className="text-teal font-bold">{priorDays} Days</span>
            </div>
            <input
              type="range"
              min={15}
              max={120}
              step={5}
              value={priorDays}
              onChange={(e) => setPriorDays(Number(e.target.value))}
              className="w-full accent-teal"
            />
            <p className="text-[11px] text-graphite font-mono">
              Historical reference period immediately preceding the evaluation window.
            </p>
          </div>
        </div>
      </div>

      {/* Academic Disclaimers / Quality Warning */}
      <div className="p-4 rounded-xl bg-citron/15 border border-citron/50 flex items-start gap-3">
        <Info size={18} className="text-pine flex-shrink-0 mt-0.5" />
        <div className="text-xs font-mono text-pine space-y-1">
          <p className="font-bold">Statistical Quality Protocol:</p>
          <p className="font-body text-graphite">
            Aspects with fewer than 5 prior-period mentions are flagged for limited data quality.
            Percentage increases from very small baseline denominators can be statistically misleading.
          </p>
        </div>
      </div>

      {/* Aspect Cards List */}
      <div className="space-y-4">
        {filteredItems.map((item, idx) => {
          const isEmerging = item.trend === 'emerging'
          const isDeclining = item.trend === 'declining'
          const borderColor = isEmerging ? '#E36B4B' : isDeclining ? '#D9D8CC' : '#377E75'

          return (
            <div
              key={idx}
              className="card-editorial transition-all hover:shadow-md"
              style={{ borderLeft: `5px solid ${borderColor}` }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xl font-semibold text-pine">
                      {item.aspect}
                    </span>

                    {/* Trend Badge */}
                    {isEmerging && (
                      <span className="badge-negative flex items-center gap-1 font-bold">
                        <Flame size={12} />
                        +{formatPct(item.growth_rate * 100, 0)} Velocity
                      </span>
                    )}
                    {item.trend === 'stable' && (
                      <span className="badge-positive font-bold">Stable Trend</span>
                    )}
                    {isDeclining && (
                      <span className="badge-neutral font-bold">
                        {formatPct(item.growth_rate * 100, 0)} Decreasing
                      </span>
                    )}

                    {/* Data Quality Warning */}
                    {item.data_quality !== 'sufficient' && (
                      <span className="bg-citron/30 text-pine border border-citron px-2 py-0.5 rounded-full text-xs font-mono flex items-center gap-1">
                        <AlertTriangle size={12} className="text-coral" />
                        Limited data — interpret with caution
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-mono text-graphite">
                    <strong>{item.recent_count} mentions</strong> in recent {recentDays}d window vs{' '}
                    <strong>{item.prior_count} mentions</strong> in prior {priorDays}d window
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      openDrawer(`Emerging Issue Evidence: ${item.aspect}`, item.sample_reviews)
                    }
                    className="btn-ghost text-xs py-2 px-4"
                  >
                    Inspect Reviews ({item.sample_reviews?.length || 0}) →
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Review Drawer */}
      <ReviewDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        reviews={drawerReviews}
      />
    </div>
  )
}
export default EmergingSignals
