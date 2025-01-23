"use client"

import { createContext, useContext, useState } from "react"
import { Task } from "@/types/daily-task-types"

interface SelectedTasksContextType {
  selectedTasks: Task[]
  selectTask: (task: Task) => void
  deselectTask: (taskId: string) => void
  isTaskSelected: (taskId: string) => boolean
  clearSelectedTasks: () => void
}

const SelectedTasksContext = createContext<SelectedTasksContextType | undefined>(undefined)

export function SelectedTasksProvider({ children }: { children: React.ReactNode }) {
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([])

  const selectTask = (task: Task) => {
    setSelectedTasks(prev => [...prev, task])
  }

  const deselectTask = (taskId: string) => {
    setSelectedTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const isTaskSelected = (taskId: string) => {
    return selectedTasks.some(t => t.id === taskId)
  }

  const clearSelectedTasks = () => {
    setSelectedTasks([])
  }

  return (
    <SelectedTasksContext.Provider 
      value={{ 
        selectedTasks, 
        selectTask, 
        deselectTask, 
        isTaskSelected,
        clearSelectedTasks 
      }}
    >
      {children}
    </SelectedTasksContext.Provider>
  )
}

export function useSelectedTasks() {
  const context = useContext(SelectedTasksContext)
  if (!context) {
    throw new Error("useSelectedTasks must be used within a SelectedTasksProvider")
  }
  return context
} 