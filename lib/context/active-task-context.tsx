"use client"

import { Task } from "@/types/daily-task-types"
import { createContext, useContext, useState } from "react"

type ColumnId = "backlog" | "incomplete" | "today" | "future" | "calendar"

interface ActiveTaskContextType {
  activeTask: Task | null
  previewTask: Task | null
  sourceColumnId: ColumnId | null
  previewColumnId: string | null
  isDraggingOverCalendar: boolean
  isDraggingOverChat: boolean
  localColumnTasks: Record<string, Task[]>
  isDragging: boolean
  setActiveTask: (task: Task | null) => void
  setPreviewTask: (task: Task | null) => void
  setSourceColumnId: (columnId: ColumnId | null) => void
  setIsDraggingOverCalendar: (isDragging: boolean) => void
  setIsDraggingOverChat: (isDragging: boolean) => void
  setPreviewColumnId: (columnId: string | null) => void
  setLocalColumnTasks: (value: Record<string, Task[]> | ((prev: Record<string, Task[]>) => Record<string, Task[]>)) => void
  setIsDragging: (isDragging: boolean) => void
}

const ActiveTaskContext = createContext<ActiveTaskContextType | undefined>(undefined)

export function ActiveTaskProvider({ children }: { children: React.ReactNode }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [previewTask, setPreviewTask] = useState<Task | null>(null)
  const [sourceColumnId, setSourceColumnId] = useState<ColumnId | null>(null)
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false)
  const [isDraggingOverChat, setIsDraggingOverChat] = useState(false)
  const [previewColumnId, setPreviewColumnId] = useState<string | null>(null)
  const [localColumnTasks, setLocalColumnTasks] = useState<Record<string, Task[]>>({})
  const [isDragging, setIsDragging] = useState(false)

  return (
    <ActiveTaskContext.Provider
      value={{
        activeTask,
        previewTask,
        sourceColumnId,
        previewColumnId,
        isDraggingOverCalendar,
        isDraggingOverChat,
        localColumnTasks,
        isDragging,
        setActiveTask,
        setPreviewTask,
        setSourceColumnId,
        setIsDraggingOverCalendar,
        setIsDraggingOverChat,
        setPreviewColumnId,
        setLocalColumnTasks,
        setIsDragging
      }}
    >
      {children}
    </ActiveTaskContext.Provider>
  )
}

export function useActiveTask() {
  const context = useContext(ActiveTaskContext)
  if (context === undefined) {
    throw new Error("useActiveTask must be used within an ActiveTaskProvider")
  }
  return context
}

export type { ColumnId } 