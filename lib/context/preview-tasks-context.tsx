"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import type { Task } from "@/types/daily-task-types"

interface PreviewTasksContextType {
  previewTasks: Record<string, Task[]>
  setPreviewTasksForColumn: (columnId: string, tasks: Task[]) => void
  clearPreviewTasks: (columnId: string) => void
  clearAllPreviewTasks: () => void
}

const PreviewTasksContext = createContext<PreviewTasksContextType | undefined>(undefined)

export function PreviewTasksProvider({ children }: { children: ReactNode }) {
  const [previewTasks, setPreviewTasks] = useState<Record<string, Task[]>>({})

  const setPreviewTasksForColumn = (columnId: string, tasks: Task[]) => {
    setPreviewTasks(prev => ({
      ...prev,
      [columnId]: tasks
    }))
  }

  const clearPreviewTasks = (columnId: string) => {
    setPreviewTasks(prev => {
      const newState = { ...prev }
      delete newState[columnId]
      return newState
    })
  }

  const clearAllPreviewTasks = () => {
    setPreviewTasks({})
  }

  return (
    <PreviewTasksContext.Provider
      value={{
        previewTasks,
        setPreviewTasksForColumn,
        clearPreviewTasks,
        clearAllPreviewTasks
      }}
    >
      {children}
    </PreviewTasksContext.Provider>
  )
}

export function usePreviewTasks() {
  const context = useContext(PreviewTasksContext)
  if (context === undefined) {
    throw new Error("usePreviewTasks must be used within a PreviewTasksProvider")
  }
  return context
} 