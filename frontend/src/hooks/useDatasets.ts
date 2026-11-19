import { useQuery } from '@tanstack/react-query'
import { datasetsApi } from '../services/api'
import type { Dataset, DatasetStats, DatasetPreview, WarehouseStats } from '../types'

export function useDatasets() {
  return useQuery<Dataset[]>({
    queryKey: ['datasets'],
    queryFn: async () => {
      const r = await datasetsApi.list()
      return r.data
    },
    refetchInterval: 10000,
  })
}

export function useDatasetStats(id: number | null) {
  return useQuery<DatasetStats>({
    queryKey: ['dataset-stats', id],
    queryFn: async () => {
      const r = await datasetsApi.getStats(id!)
      return r.data
    },
    enabled: id != null,
  })
}

export function useDatasetPreview(id: number | null) {
  return useQuery<DatasetPreview>({
    queryKey: ['dataset-preview', id],
    queryFn: async () => {
      const r = await datasetsApi.preview(id!)
      return r.data
    },
    enabled: id != null,
  })
}

export function useWarehouseStats(): { data: WarehouseStats | undefined; isLoading: boolean } {
  // This would call a warehouse endpoint - placeholder structure
  return useQuery<WarehouseStats>({
    queryKey: ['warehouse-stats'],
    queryFn: async () => {
      // Fallback: could be /datasets/warehouse-stats
      return { dim_product_count: 0, dim_category_count: 0, dim_source_count: 0, dim_date_count: 0, fact_review_count: 0 }
    },
  })
}
