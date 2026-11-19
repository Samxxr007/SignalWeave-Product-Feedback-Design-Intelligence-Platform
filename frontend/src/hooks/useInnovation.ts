import { useQuery } from '@tanstack/react-query'
import { innovationApi } from '../services/api'
import type { PainIndexResult, EmergingComplaint, FeatureRequest, FeatureTheme, OpportunityMapItem, RoadmapScenario } from '../types'

export function usePainIndex(datasetId: number | null) {
  return useQuery<PainIndexResult[]>({
    queryKey: ['pain-index', datasetId],
    queryFn: async () => {
      const r = await innovationApi.getPainIndexResults(datasetId!)
      return r.data
    },
    enabled: datasetId != null,
  })
}

export function useEmergingComplaints(datasetId: number | null, recentDays = 60, priorDays = 60) {
  return useQuery<EmergingComplaint[]>({
    queryKey: ['emerging-complaints', datasetId, recentDays, priorDays],
    queryFn: async () => {
      const r = await innovationApi.getEmergingComplaints(datasetId!, recentDays, priorDays)
      return r.data
    },
    enabled: datasetId != null,
  })
}

export function useFeatureRequests(datasetId: number | null) {
  return useQuery<FeatureRequest[]>({
    queryKey: ['feature-requests', datasetId],
    queryFn: async () => {
      const r = await innovationApi.getFeatureRequests(datasetId!)
      return r.data
    },
    enabled: datasetId != null,
  })
}

export function useFeatureThemes(datasetId: number | null) {
  return useQuery<FeatureTheme[]>({
    queryKey: ['feature-themes', datasetId],
    queryFn: async () => {
      const r = await innovationApi.getFeatureThemes(datasetId!)
      return r.data
    },
    enabled: datasetId != null,
  })
}

export function useOpportunityMap(datasetId: number | null) {
  return useQuery<OpportunityMapItem[]>({
    queryKey: ['opportunity-map', datasetId],
    queryFn: async () => {
      const r = await innovationApi.getOpportunityMap(datasetId!)
      return r.data
    },
    enabled: datasetId != null,
  })
}

export function useScenarios(datasetId: number | null) {
  return useQuery<RoadmapScenario[]>({
    queryKey: ['scenarios', datasetId],
    queryFn: async () => {
      const r = await innovationApi.getScenarios(datasetId!)
      return r.data
    },
    enabled: datasetId != null,
  })
}
