import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:8000/api/v1' })

// Datasets
export const datasetsApi = {
  upload: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return API.post('/datasets/upload', fd)
  },
  list: () => API.get('/datasets/'),
  getStats: (id: number) => API.get(`/datasets/${id}/stats`),
  preview: (id: number) => API.get(`/datasets/${id}/preview`),
  validate: (id: number, mapping: object) => API.post(`/datasets/${id}/validate`, mapping),
  loadWarehouse: (id: number) => API.post(`/datasets/${id}/load-warehouse`),
}

// Preprocessing
export const preprocessingApi = {
  run: (datasetId: number) => API.post(`/preprocessing/${datasetId}/run`),
  status: (datasetId: number) => API.get(`/preprocessing/${datasetId}/status`),
  inspect: (datasetId: number, reviewId: number) => API.get(`/preprocessing/${datasetId}/inspect/${reviewId}`),
  qualityReport: (datasetId: number) => API.get(`/preprocessing/${datasetId}/quality-report`),
}

// Analytics / OLAP
export const analyticsApi = {
  summary: (datasetId: number) => API.get(`/analytics/summary?dataset_id=${datasetId}`),
  olap: (params: object) => API.get('/analytics/olap', { params }),
  trends: (datasetId: number, period: string, category?: string) =>
    API.get('/analytics/trends', { params: { dataset_id: datasetId, period, category } }),
  productMatrix: (datasetId: number) => API.get(`/analytics/product-matrix?dataset_id=${datasetId}`),
  sentimentDist: (datasetId: number, groupBy?: string) =>
    API.get('/analytics/sentiment-distribution', { params: { dataset_id: datasetId, group_by: groupBy } }),
}

// Mining
export const miningApi = {
  runSentiment: (datasetId: number) => API.post(`/mining/sentiment/run?dataset_id=${datasetId}`),
  runAspects: (datasetId: number) => API.post(`/mining/aspects/run?dataset_id=${datasetId}`),
  runTopics: (datasetId: number, nComponents = 10) =>
    API.post(`/mining/topics/run?dataset_id=${datasetId}&n_components=${nComponents}`),
  runClustering: (datasetId: number, k = 6) =>
    API.post(`/mining/clustering/run?dataset_id=${datasetId}&k=${k}`),
  runAssociation: (datasetId: number, minSupport = 0.05, minConfidence = 0.3) =>
    API.post(`/mining/association/run?dataset_id=${datasetId}&min_support=${minSupport}&min_confidence=${minConfidence}`),
  history: (datasetId: number) => API.get(`/mining/history?dataset_id=${datasetId}`),
  getResult: (runId: number) => API.get(`/mining/results/${runId}`),
  getAspectDictionary: () => API.get('/mining/aspect-dictionary'),
  addAspect: (data: object) => API.post('/mining/aspect-dictionary', data),
  updateAspect: (id: number, data: object) => API.put(`/mining/aspect-dictionary/${id}`, data),
}

// Innovation
export const innovationApi = {
  calculatePainIndex: (datasetId: number, weights?: object) =>
    API.post(`/innovation/pain-index/calculate?dataset_id=${datasetId}`, { weights }),
  getPainIndexResults: (datasetId: number) => API.get(`/innovation/pain-index/results?dataset_id=${datasetId}`),
  getEmergingComplaints: (datasetId: number, recentDays = 60, priorDays = 60) =>
    API.get('/innovation/emerging-complaints', { params: { dataset_id: datasetId, recent_days: recentDays, prior_days: priorDays } }),
  getFeatureRequests: (datasetId: number) => API.get(`/innovation/feature-requests?dataset_id=${datasetId}`),
  confirmFeatureRequest: (id: number) => API.post(`/innovation/feature-requests/${id}/confirm`),
  rejectFeatureRequest: (id: number) => API.post(`/innovation/feature-requests/${id}/reject`),
  getFeatureThemes: (datasetId: number) => API.get(`/innovation/feature-requests/themes?dataset_id=${datasetId}`),
  getOpportunityMap: (datasetId: number) => API.get(`/innovation/opportunity-map?dataset_id=${datasetId}`),
  setEffortEstimate: (data: object) => API.post('/innovation/effort-estimate', data),
  getRecommendations: (datasetId: number) => API.get(`/innovation/recommendations?dataset_id=${datasetId}`),
  simulateRoadmap: (data: object) => API.post('/innovation/roadmap/simulate', data),
  getScenarios: (datasetId: number) => API.get(`/innovation/roadmap/scenarios?dataset_id=${datasetId}`),
}

// Health
export const healthApi = {
  check: () => API.get('/health'),
}
