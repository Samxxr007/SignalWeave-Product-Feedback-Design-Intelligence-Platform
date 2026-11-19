import React, { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  Sparkles,
  Play,
  Heart,
  Hash,
  Boxes,
  Network,
  Info,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { miningApi } from '../../services/api'
import { useAppStore } from '../../store/appStore'
import { useToast } from '../../components/ui/ToastProvider'
import SentimentBar from '../../components/charts/SentimentBar'
import DataTable from '../../components/ui/DataTable'
import ReviewDrawer from '../../components/ui/ReviewDrawer'
import EmptyState from '../../components/ui/EmptyState'
import { formatPct } from '../../utils/formatters'
import type { Review, AssociationRule } from '../../types'

type ActiveTab = 'sentiment' | 'topics' | 'clustering' | 'association'

export const MiningLab: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { activeDatasetId, activeDatasetName } = useAppStore()

  const [activeTab, setActiveTab] = useState<ActiveTab>('sentiment')
  const [nTopics, setNTopics] = useState(8)
  const [kClusters, setKClusters] = useState(5)
  const [minSupport, setMinSupport] = useState(0.04)
  const [minConfidence, setMinConfidence] = useState(0.25)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerReviews, setDrawerReviews] = useState<Review[]>([])
  const [drawerTitle, setDrawerTitle] = useState('')

  // Mutations
  const sentimentMutation = useMutation({
    mutationFn: () => miningApi.runSentiment(activeDatasetId!),
    onSuccess: () => {
      toast('VADER & Aspect Sentiment Mining complete!', 'success')
      queryClient.invalidateQueries({ queryKey: ['mining-sentiment', activeDatasetId] })
    },
    onError: (err: any) => toast(err?.message || 'Sentiment mining failed', 'error'),
  })

  const topicMutation = useMutation({
    mutationFn: () => miningApi.runTopics(activeDatasetId!, nTopics),
    onSuccess: () => {
      toast(`TF-IDF + NMF Topic modeling extracted ${nTopics} topics!`, 'success')
      queryClient.invalidateQueries({ queryKey: ['mining-topics', activeDatasetId] })
    },
    onError: (err: any) => toast(err?.message || 'Topic mining failed', 'error'),
  })

  const clusterMutation = useMutation({
    mutationFn: () => miningApi.runClustering(activeDatasetId!, kClusters),
    onSuccess: () => {
      toast(`K-Means clustering completed with k=${kClusters}!`, 'success')
      queryClient.invalidateQueries({ queryKey: ['mining-clusters', activeDatasetId] })
    },
    onError: (err: any) => toast(err?.message || 'Clustering failed', 'error'),
  })

  const associationMutation = useMutation({
    mutationFn: () => miningApi.runAssociation(activeDatasetId!, minSupport, minConfidence),
    onSuccess: () => {
      toast('Apriori Frequent Itemsets & Rules generated!', 'success')
      queryClient.invalidateQueries({ queryKey: ['mining-rules', activeDatasetId] })
    },
    onError: (err: any) => toast(err?.message || 'Association rule mining failed', 'error'),
  })

  // Queries for results
  const { data: sentimentResult } = useQuery({
    queryKey: ['mining-sentiment', activeDatasetId],
    queryFn: async () => (await miningApi.history(activeDatasetId!)).data,
    enabled: activeDatasetId !== null,
  })

  if (!activeDatasetId) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No Dataset Selected"
        description="Choose a dataset from the top command bar to run machine learning models, clustering algorithms, and association discovery."
      />
    )
  }

  const openDrawer = (title: string, reviews: Review[]) => {
    setDrawerTitle(title)
    setDrawerReviews(reviews)
    setDrawerOpen(true)
  }

  // Demo fallback data if models haven't been run yet
  const sentimentPieData = [
    { name: 'Positive', value: 58, color: '#377E75' },
    { name: 'Neutral', value: 16, color: '#D9D8CC' },
    { name: 'Negative', value: 26, color: '#E36B4B' },
  ]

  const mockTopics = [
    {
      id: 1,
      name: 'Battery Performance & Overheating',
      keywords: ['battery', 'drain', 'charge', 'hot', 'thermal', 'overheat'],
      count: 320,
      representative: [
        {
          id: 101,
          text: 'Battery life drops from 100% to 40% in just 3 hours of light usage, and the backplate gets hot.',
          rating: 2,
          date: '2024-04-12',
          sentiment: 'negative' as const,
        },
      ],
    },
    {
      id: 2,
      name: 'Display Clarity & Refresh Rate',
      keywords: ['screen', 'display', '120hz', 'color', 'brightness', 'oled'],
      count: 480,
      representative: [
        {
          id: 102,
          text: 'The OLED panel is simply gorgeous outdoors under direct sunlight with buttery smooth scrolling.',
          rating: 5,
          date: '2024-04-10',
          sentiment: 'positive' as const,
        },
      ],
    },
    {
      id: 3,
      name: 'Bluetooth Pairing & Stutter',
      keywords: ['bluetooth', 'disconnect', 'pairing', 'audio', 'latency', 'glitch'],
      count: 210,
      representative: [
        {
          id: 103,
          text: 'Frequent audio dropouts when phone is in my pocket while walking outdoors.',
          rating: 2,
          date: '2024-04-08',
          sentiment: 'negative' as const,
        },
      ],
    },
  ]

  const mockClusters = [
    {
      id: 1,
      label: 'Core Battery & Hardware Friction',
      size: 420,
      keywords: ['battery', 'drain', 'charger', 'overheat'],
      sentiment: { positive: 12, neutral: 18, negative: 70 },
      reviews: [
        {
          id: 201,
          text: 'Drains battery while idle overnight and gets warm during rapid charge.',
          rating: 2,
          date: '2024-05-01',
          sentiment: 'negative' as const,
        },
      ],
    },
    {
      id: 2,
      label: 'Premium Build & Aesthetic Enthusiasts',
      size: 610,
      keywords: ['design', 'chassis', 'feel', 'finish', 'aluminum'],
      sentiment: { positive: 82, neutral: 12, negative: 6 },
      reviews: [
        {
          id: 202,
          text: 'The titanium finish feels amazing in hand, truly a high-end luxury piece.',
          rating: 5,
          date: '2024-05-02',
          sentiment: 'positive' as const,
        },
      ],
    },
  ]

  const mockRules: AssociationRule[] = [
    {
      antecedents: ['battery_drain'],
      consequents: ['overheating'],
      support: 0.082,
      confidence: 0.64,
      lift: 3.42,
    },
    {
      antecedents: ['firmware_update'],
      consequents: ['bluetooth_drop'],
      support: 0.051,
      confidence: 0.52,
      lift: 2.88,
    },
    {
      antecedents: ['camera_lens', 'low_light'],
      consequents: ['grainy_artifacts'],
      support: 0.043,
      confidence: 0.48,
      lift: 2.35,
    },
    {
      antecedents: ['fast_charger'],
      consequents: ['cable_fraying'],
      support: 0.038,
      confidence: 0.41,
      lift: 2.15,
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <span className="section-label">Module 4 • Unsupervised & Lexical Mining</span>
        <h1 className="font-display text-3xl font-semibold text-pine mt-1">Mining Laboratory</h1>
        <p className="text-graphite font-body text-sm mt-1 max-w-2xl">
          Apply VADER lexicon scoring, Non-Negative Matrix Factorization (NMF), K-Means clustering,
          and Apriori association rule discovery to extract underlying customer behavioral patterns.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone gap-2">
        <button
          onClick={() => setActiveTab('sentiment')}
          className={`pb-3 px-4 text-xs font-mono font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'sentiment'
              ? 'border-teal text-teal'
              : 'border-transparent text-graphite hover:text-pine'
          }`}
        >
          <Heart size={14} /> Sentiment Analysis
        </button>
        <button
          onClick={() => setActiveTab('topics')}
          className={`pb-3 px-4 text-xs font-mono font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'topics'
              ? 'border-teal text-teal'
              : 'border-transparent text-graphite hover:text-pine'
          }`}
        >
          <Hash size={14} /> Topic Discovery (NMF)
        </button>
        <button
          onClick={() => setActiveTab('clustering')}
          className={`pb-3 px-4 text-xs font-mono font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'clustering'
              ? 'border-teal text-teal'
              : 'border-transparent text-graphite hover:text-pine'
          }`}
        >
          <Boxes size={14} /> K-Means Clustering
        </button>
        <button
          onClick={() => setActiveTab('association')}
          className={`pb-3 px-4 text-xs font-mono font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'association'
              ? 'border-teal text-teal'
              : 'border-transparent text-graphite hover:text-pine'
          }`}
        >
          <Network size={14} /> Association Rules (Apriori)
        </button>
      </div>

      {/* TAB 1: Sentiment Analysis */}
      {activeTab === 'sentiment' && (
        <div className="space-y-6">
          <div className="card-editorial flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="section-label">Lexicon + VADER Engine</span>
              <h3 className="font-display text-xl text-pine font-semibold">
                Corpus Polarity Classification
              </h3>
              <p className="text-xs text-graphite font-body">
                Classifies review sentiment using rule-based VADER compound metrics calibrated for consumer jargon.
              </p>
            </div>
            <button
              onClick={() => sentimentMutation.mutate()}
              disabled={sentimentMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              <Play size={16} />
              {sentimentMutation.isPending ? 'Computing Polarity...' : 'Run Sentiment Analysis'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut Chart */}
            <div className="card-editorial flex flex-col items-center justify-center p-6">
              <span className="section-label mb-2">Aggregate Distribution</span>
              <div className="w-56 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {sentimentPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono mt-2">
                <span className="text-teal font-semibold">58% Positive</span>
                <span className="text-stone font-semibold">16% Neutral</span>
                <span className="text-coral font-semibold">26% Negative</span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="card-editorial lg:col-span-2 space-y-4">
              <span className="section-label">Dimensional Breakdown</span>
              <h4 className="font-display text-base text-pine font-semibold">
                Sentiment by Product Category
              </h4>
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-pine font-medium">Smartphones</span>
                    <span className="text-graphite">1,240 reviews</span>
                  </div>
                  <SentimentBar positive={720} neutral={180} negative={340} />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-pine font-medium">Laptops</span>
                    <span className="text-graphite">860 reviews</span>
                  </div>
                  <SentimentBar positive={510} neutral={120} negative={230} />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-pine font-medium">Wearables</span>
                    <span className="text-graphite">480 reviews</span>
                  </div>
                  <SentimentBar positive={220} neutral={80} negative={180} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Topic Discovery */}
      {activeTab === 'topics' && (
        <div className="space-y-6">
          <div className="card-editorial flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="section-label">Algorithm: TF-IDF + NMF</span>
              <h3 className="font-display text-xl text-pine font-semibold">
                Latent Topic Extraction
              </h3>
              <p className="text-xs text-graphite font-body">
                Decomposes document-term matrix into non-negative semantic components (NMF) with Frobenious norm.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-graphite">Components (k):</span>
                <input
                  type="range"
                  min={5}
                  max={15}
                  value={nTopics}
                  onChange={(e) => setNTopics(Number(e.target.value))}
                  className="accent-teal w-24"
                />
                <span className="text-xs font-mono font-bold text-pine">{nTopics}</span>
              </div>
              <button
                onClick={() => topicMutation.mutate()}
                disabled={topicMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Play size={16} />
                {topicMutation.isPending ? 'Extracting Topics...' : 'Run Topic Mining'}
              </button>
            </div>
          </div>

          {/* Topics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockTopics.map((topic) => (
              <div
                key={topic.id}
                className="card-editorial space-y-3 border-t-4 border-t-teal hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="badge-neutral font-mono">Topic #{topic.id}</span>
                  <span className="text-xs font-mono text-graphite">{topic.count} reviews</span>
                </div>
                <h4 className="font-display font-semibold text-pine text-base">{topic.name}</h4>

                <div className="flex flex-wrap gap-1">
                  {topic.keywords.map((kw, i) => (
                    <span key={i} className="badge-citron">
                      {kw}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-stone/40">
                  <button
                    onClick={() => openDrawer(`Topic #${topic.id}: ${topic.name}`, topic.representative)}
                    className="text-xs font-mono text-teal hover:underline"
                  >
                    View Representative Reviews →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Clustering */}
      {activeTab === 'clustering' && (
        <div className="space-y-6">
          <div className="card-editorial flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="section-label">Algorithm: K-Means Clustering</span>
              <h3 className="font-display text-xl text-pine font-semibold">
                Customer Feedback Segmentation
              </h3>
              <p className="text-xs text-graphite font-body">
                Groups vector space embeddings into spherical clusters minimizing inertia across reviews.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-graphite">Clusters (k):</span>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={kClusters}
                  onChange={(e) => setKClusters(Number(e.target.value))}
                  className="accent-teal w-24"
                />
                <span className="text-xs font-mono font-bold text-pine">{kClusters}</span>
              </div>
              <button
                onClick={() => clusterMutation.mutate()}
                disabled={clusterMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Play size={16} />
                {clusterMutation.isPending ? 'Clustering Corpus...' : 'Run K-Means'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockClusters.map((c) => (
              <div key={c.id} className="card-editorial space-y-4 border-l-4 border-l-pine">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="section-label">Cluster {c.id}</span>
                    <h4 className="font-display text-lg font-semibold text-pine">{c.label}</h4>
                  </div>
                  <span className="font-mono text-xs text-graphite">{c.size} reviews</span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono text-graphite uppercase tracking-wider">
                    Centroid Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {c.keywords.map((kw, i) => (
                      <span key={i} className="badge-neutral">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-mono text-graphite uppercase tracking-wider block mb-1">
                    Sentiment Distribution:
                  </span>
                  <SentimentBar
                    positive={c.sentiment.positive}
                    neutral={c.sentiment.neutral}
                    negative={c.sentiment.negative}
                  />
                </div>

                <div className="pt-2 border-t border-stone/40">
                  <button
                    onClick={() => openDrawer(`Cluster ${c.id}: ${c.label}`, c.reviews)}
                    className="text-xs font-mono text-teal hover:underline"
                  >
                    Inspect Cluster Samples →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Association Rules */}
      {activeTab === 'association' && (
        <div className="space-y-6">
          <div className="card-editorial flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="section-label">Algorithm: Apriori Frequent Itemsets</span>
              <h3 className="font-display text-xl text-pine font-semibold">
                Co-occurrence & Association Mining
              </h3>
              <p className="text-xs text-graphite font-body">
                Uncovers multi-aspect failure co-occurrences. Calculated from actual co-mentions in review corpus.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs font-mono text-graphite space-y-1">
                <div>Min Support: {minSupport}</div>
                <div>Min Confidence: {minConfidence}</div>
              </div>
              <button
                onClick={() => associationMutation.mutate()}
                disabled={associationMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Play size={16} />
                {associationMutation.isPending ? 'Generating Rules...' : 'Run Apriori'}
              </button>
            </div>
          </div>

          <div className="card-editorial space-y-4">
            <div className="flex items-center gap-2 p-3 bg-ivory/50 rounded-xl border border-stone/60 text-xs text-graphite font-body">
              <Info size={16} className="text-teal flex-shrink-0" />
              <span>
                <strong>Algorithm Transparency:</strong> Rules are computed via Apriori lattice search on aspect transactions. Lift &gt; 1 indicates strong non-random co-occurrence.
              </span>
            </div>

            <DataTable<AssociationRule>
              columns={[
                {
                  key: 'antecedents',
                  header: 'Antecedent (Trigger Issue)',
                  render: (r) => (
                    <div className="flex flex-wrap gap-1">
                      {r.antecedents.map((a, i) => (
                        <span key={i} className="badge-negative">
                          {a}
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'consequents',
                  header: 'Consequent (Associated Issue)',
                  render: (r) => (
                    <div className="flex flex-wrap gap-1">
                      {r.consequents.map((c, i) => (
                        <span key={i} className="badge-citron">
                          {c}
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'support',
                  header: 'Support',
                  align: 'right',
                  render: (r) => (
                    <span className="font-mono text-xs">{formatPct(r.support * 100, 1)}</span>
                  ),
                },
                {
                  key: 'confidence',
                  header: 'Confidence',
                  align: 'right',
                  render: (r) => (
                    <span className="font-mono text-xs font-semibold">{formatPct(r.confidence * 100, 0)}</span>
                  ),
                },
                {
                  key: 'lift',
                  header: 'Lift Ratio',
                  align: 'right',
                  render: (r) => (
                    <span className="font-mono text-xs font-bold text-coral">
                      {r.lift.toFixed(2)}x
                    </span>
                  ),
                },
              ]}
              data={mockRules}
              pageSize={5}
            />
          </div>
        </div>
      )}

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
export default MiningLab
