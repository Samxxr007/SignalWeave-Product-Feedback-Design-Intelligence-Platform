import { create } from 'zustand'

interface Filters {
  category?: string
  product?: string
  dateFrom?: string
  dateTo?: string
}

interface AppStore {
  activeDatasetId: number | null
  activeDatasetName: string | null
  setActiveDataset: (id: number, name: string) => void
  filters: Filters
  setFilters: (filters: Partial<Filters>) => void
  clearFilters: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  activeDatasetId: null,
  activeDatasetName: null,
  setActiveDataset: (id, name) => set({ activeDatasetId: id, activeDatasetName: name }),
  filters: {},
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  clearFilters: () => set({ filters: {} }),
}))
