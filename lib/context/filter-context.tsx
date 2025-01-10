"use client"

import { createContext, useContext, useState, useCallback } from "react"
import { FilterContextType } from "@/types/filter-types"

const FilterContext = createContext<FilterContextType | undefined>(undefined)

const MAX_RECENT_TAGS = 3

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [recentTags, setRecentTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  const addFilter = useCallback((filter: string) => {
    setActiveFilters(prev => {
      if (prev.includes(filter)) return prev
      return [...prev, filter]
    })
  }, [])

  const removeFilter = useCallback((filter: string) => {
    setActiveFilters(prev => prev.filter(f => f !== filter))
  }, [])

  const clearFilters = useCallback(() => {
    setActiveFilters([])
  }, [])

  const addRecentTag = useCallback((tag: string) => {
    setRecentTags(prev => {
      // Remove the tag if it already exists
      const filtered = prev.filter(t => t !== tag)
      // Add the tag to the beginning and limit to MAX_RECENT_TAGS
      return [tag, ...filtered].slice(0, MAX_RECENT_TAGS)
    })
  }, [])

  return (
    <FilterContext.Provider
      value={{
        activeFilters,
        recentTags,
        availableTags,
        addFilter,
        removeFilter,
        addRecentTag,
        clearFilters,
        setAvailableTags
      }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export function useFilter() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error("useFilter must be used within a FilterProvider")
  }
  return context
} 