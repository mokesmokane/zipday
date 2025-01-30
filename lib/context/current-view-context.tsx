"use client"

import React, { createContext, useContext, useState } from "react"

type ViewType = "board" | "calendar"

interface CurrentViewContextType {
  currentView: ViewType
  setCurrentView: (view: ViewType) => void
}

const CurrentViewContext = createContext<CurrentViewContextType | undefined>(
  undefined
)

export function CurrentViewProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [currentView, setCurrentView] = useState<ViewType>("board")

  return (
    <CurrentViewContext.Provider value={{ currentView, setCurrentView }}>
      {children}
    </CurrentViewContext.Provider>
  )
}

export function useCurrentView() {
  const context = useContext(CurrentViewContext)
  if (context === undefined) {
    throw new Error("useCurrentView must be used within a CurrentViewProvider")
  }
  return context
}
