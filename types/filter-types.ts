export interface FilterContextType {
  activeFilters: string[]
  recentTags: string[]
  availableTags: string[]
  addFilter: (filter: string) => void
  removeFilter: (filter: string) => void
  addRecentTag: (tag: string) => void
  clearFilters: () => void
  setAvailableTags: (tags: string[]) => void
} 