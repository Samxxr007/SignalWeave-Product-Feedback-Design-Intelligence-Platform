import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../services/api'
import type { AnalyticsSummary, TrendPoint, ProductMatrixItem, SentimentDistribution } from '../types'

export function useAnalyticsSummary(datasetId: number | null) {
  return useQuery<AnalyticsSummary>({
    queryKey: ['analytics-summary', datasetId],
    queryFn: async () => {
      const r = await analyticsApi.summary(datasetId!)
      return r.data
    },
    enabled: datasetId != null,
  })
}

export function useTrends(datasetId: number | null, period: string, category?: string) {
  return useQuery<TrendPoint[]>({
    queryKey: ['trends', datasetId, period, category],
    queryFn: async () => {
      const r = await analyticsApi.trends(datasetId!, period, category)
      return r.data
    },
    enabled: datasetId != null,
  })
}

export function useProductMatrix(datasetId: number | null) {
  return useQuery<ProductMatrixItem[]>({
    queryKey: ['product-matrix', datasetId],
    queryFn: async () => {
      const r = await analyticsApi.productMatrix(datasetId!)
      return r.data
    },
    enabled: datasetId != null,
  })
}

export function useSentimentDist(datasetId: number | null, groupBy?: string) {
  return useQuery<SentimentDistribution>({
    queryKey: ['sentiment-dist', datasetId, groupBy],
    queryFn: async () => {
      const r = await analyticsApi.sentimentDist(datasetId!, groupBy)
      return r.data
    },
    enabled: datasetId != null,
  })
}
