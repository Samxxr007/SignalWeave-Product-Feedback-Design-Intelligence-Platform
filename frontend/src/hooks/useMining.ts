import { useQuery } from '@tanstack/react-query'
import { miningApi } from '../services/api'
import type { MiningRun, SentimentResult, TopicResult, ClusterResult, AssociationResult, AspectDictionaryEntry } from '../types'

export function useMiningHistory(datasetId: number | null) {
  return useQuery<MiningRun[]>({
    queryKey: ['mining-history', datasetId],
    queryFn: async () => {
      const r = await miningApi.history(datasetId!)
      return r.data
    },
    enabled: datasetId != null,
  })
}

export function useMiningResult(runId: number | null) {
  return useQuery<SentimentResult | TopicResult | ClusterResult | AssociationResult>({
    queryKey: ['mining-result', runId],
    queryFn: async () => {
      const r = await miningApi.getResult(runId!)
      return r.data
    },
    enabled: runId != null,
  })
}

export function useAspectDictionary() {
  return useQuery<AspectDictionaryEntry[]>({
    queryKey: ['aspect-dictionary'],
    queryFn: async () => {
      const r = await miningApi.getAspectDictionary()
      return r.data
    },
  })
}
