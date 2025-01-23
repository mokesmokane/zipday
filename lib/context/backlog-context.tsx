"use client"

import { createContext, useContext, useEffect, useState, useRef } from "react"
import { 
  getBacklogTasksAction, 
  addBacklogTaskAction,
  deleteBacklogTaskAction,
  updateBacklogTaskAction,
  reorderBacklogTasksAction 
} from "@/actions/db/tasks-actions"
import { useAuth } from "./auth-context"
import { Task } from "@/types/daily-task-types"
import { toast } from "@/components/ui/use-toast"

interface BacklogContextType {
  backlogTasks: Task[]
  isLoading: boolean
  error: string | null
  refreshBacklog: () => Promise<void>
  addTask: (task: Task, insertIndex?: number) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  reorderTasks: (taskIds: string[]) => Promise<void>
  updateBacklogPreview: (previewTasks: Task[]) => void
  clearPreviews: () => void
}

const BacklogContext = createContext<BacklogContextType | undefined>(undefined)

export function BacklogProvider({ children }: { children: React.ReactNode }) {
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Keep ref to backlog so we can do a shallow compare
  const prevBacklogRef = useRef(backlogTasks)

  const refreshBacklog = async () => {
    console.log("Refreshing backlog")

    if (!user) {
      // If user is not logged in, just clear backlog if not already empty
      if (backlogTasks.length !== 0) {
        setBacklogTasks([])
      }
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const backlogResult = await getBacklogTasksAction()
    if (backlogResult.isSuccess && backlogResult.data) {
      console.log("Backlog tasks:", backlogResult.data)
      // Compare to previous
      const newData = backlogResult.data
      const changed = JSON.stringify(newData) !== JSON.stringify(prevBacklogRef.current)

      if (changed) {
        setBacklogTasks(newData)
        prevBacklogRef.current = newData
      }
      setError(null)
    } else {
      console.error("Failed to get backlog tasks:", backlogResult.message)
      setError(backlogResult.message || "Error loading backlog tasks")
      setBacklogTasks([])
    }

    setIsLoading(false)
  }

  const addTask = async (task: Task, insertIndex?: number) => {
    const tempTask: Task = {
      ...task,
      id: task.id || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    console.log("Adding task to backlog:", tempTask)
    console.log("Insert index:", insertIndex)

    if (insertIndex !== undefined) {
      setBacklogTasks(prev => [...prev.slice(0, insertIndex), tempTask, ...prev.slice(insertIndex)])
      prevBacklogRef.current = [...prevBacklogRef.current.slice(0, insertIndex), tempTask, ...prevBacklogRef.current.slice(insertIndex)]
    } else {
      setBacklogTasks(prev => [...prev, tempTask])
      prevBacklogRef.current = [...prevBacklogRef.current, tempTask]
    }

    try {
      const result = await addBacklogTaskAction(tempTask, insertIndex)
      if (result.isSuccess && result.data) {
        setBacklogTasks(prev =>
          prev.map(t => (t.id === tempTask.id ? result.data! : t))
        )
        prevBacklogRef.current = prevBacklogRef.current.map(t =>
          t.id === tempTask.id ? result.data! : t
        )
      } else {
        // revert
        setBacklogTasks(prev => prev.filter(t => t.id !== tempTask.id))
        prevBacklogRef.current = prevBacklogRef.current.filter(
          t => t.id !== tempTask.id
        )
        setError(result.message)
      }
    } catch (error) {
      // revert
      setBacklogTasks(prev => prev.filter(t => t.id !== tempTask.id))
      prevBacklogRef.current = prevBacklogRef.current.filter(
        t => t.id !== tempTask.id
      )
      setError("Failed to add task to backlog")
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTask = async (taskId: string) => {
    // Optimistic delete
    setBacklogTasks(prev => prev.filter(t => t.id !== taskId))
    prevBacklogRef.current = prevBacklogRef.current.filter(t => t.id !== taskId)

    try {
      const result = await deleteBacklogTaskAction(taskId)
      if (!result.isSuccess) {
        // Revert on failure
        await refreshBacklog()
      }
    } catch (error) {
      await refreshBacklog()
    }
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic update
    setBacklogTasks(prev => 
      prev.map(t => t.id === taskId 
        ? { ...t, ...updates, updatedAt: new Date().toISOString() } 
        : t
      )
    )
    prevBacklogRef.current = prevBacklogRef.current.map(t => 
      t.id === taskId 
        ? { ...t, ...updates, updatedAt: new Date().toISOString() } 
        : t
    )

    try {
      const result = await updateBacklogTaskAction(taskId, updates)
      if (!result.isSuccess) {
        // Revert on failure
        await refreshBacklog()
      }
    } catch (error) {
      await refreshBacklog()
    }
  }

  const reorderTasks = async (taskIds: string[]) => {
    try {
      console.log("Reordering tasks:", taskIds)
      setIsLoading(true)

      // Optimistically reorder
      const reorderedTasks = taskIds
        .map(id => backlogTasks.find(t => t.id === id))
        .filter((task): task is Task => task !== undefined)

      setBacklogTasks(reorderedTasks)
      prevBacklogRef.current = reorderedTasks

      const result = await reorderBacklogTasksAction(taskIds)
      if (!result.isSuccess) {
        // revert
        await refreshBacklog()
        setError(result.message)
      }
    } catch (error) {
      await refreshBacklog()
      setError("Failed to reorder backlog tasks")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Only refresh backlog if user is not null
    if (user) {
      void refreshBacklog()
    } else {
      // If user is null, clear tasks
      setBacklogTasks([])
      prevBacklogRef.current = []
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <BacklogContext.Provider
      value={{
        backlogTasks,
        isLoading,
        error,
        refreshBacklog,
        addTask,
        deleteTask,
        updateTask,
        reorderTasks,
        updateBacklogPreview: () => {},
        clearPreviews: () => {},
      }}
    >
      {children}
    </BacklogContext.Provider>
  )
}

export function useBacklog() {
  const context = useContext(BacklogContext)
  if (!context) {
    throw new Error("useBacklog must be used within a BacklogProvider")
  }
  return context
}