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
  deleteBacklogTask: (taskId: string) => Promise<void>
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
  const prevBacklogRef = useRef<Task[]>([])
  const taskQueueRef = useRef<Promise<void>>(Promise.resolve())

  const refreshBacklog = async () => {
    if (!user) {
      setBacklogTasks([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getBacklogTasksAction()
      if (result.isSuccess && result.data) {
        const tasksWithBacklogFlag = result.data.map(task => ({
          ...task,
          isBacklog: true
        }))
        setBacklogTasks(tasksWithBacklogFlag)
        prevBacklogRef.current = tasksWithBacklogFlag
      } else {
        setError(result.message)
      }
    } catch (error) {
      console.error("Error getting backlog tasks:", error)
      setError("Failed to get backlog tasks")
    } finally {
      setIsLoading(false)
    }
  }

  const addTask = async (task: Task, insertIndex?: number) => {
    // Queue this task addition to run after any pending operations
    taskQueueRef.current = taskQueueRef.current.then(async () => {
      const tempTask: Task = {
        ...task,
        id: task.id || crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isBacklog: true
      }

      console.log("Adding task to backlog:", tempTask)
      console.log("Insert index:", insertIndex)

      // Update local state
      setBacklogTasks(prev => {
        const newTasks = insertIndex !== undefined
          ? [...prev.slice(0, insertIndex), tempTask, ...prev.slice(insertIndex)]
          : [...prev, tempTask]
        prevBacklogRef.current = newTasks
        return newTasks
      })

      try {
        const result = await addBacklogTaskAction(tempTask, insertIndex)
        if (result.isSuccess && result.data) {
          setBacklogTasks(prev =>
            prev.map(t => (t.id === tempTask.id ? { ...result.data!, isBacklog: true } : t))
          )
          prevBacklogRef.current = prevBacklogRef.current.map(t =>
            t.id === tempTask.id ? { ...result.data!, isBacklog: true } : t
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
    }).catch(error => {
      console.error("Error in task queue:", error)
    })

    return taskQueueRef.current
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

  // Alias for deleteTask to match the interface
  const deleteBacklogTask = deleteTask

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic update
    setBacklogTasks(prev => 
      prev.map(t => t.id === taskId 
        ? { ...t, ...updates, updatedAt: new Date().toISOString(), isBacklog: true } 
        : t
      )
    )
    prevBacklogRef.current = prevBacklogRef.current.map(t => 
      t.id === taskId 
        ? { ...t, ...updates, updatedAt: new Date().toISOString(), isBacklog: true } 
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
        .map(task => ({ ...task, isBacklog: true }))

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

  const updateBacklogPreview = (previewTasks: Task[]) => {
    setBacklogTasks(previewTasks.map(task => ({ ...task, isBacklog: true })))
  }

  const clearPreviews = () => {
    setBacklogTasks(prevBacklogRef.current)
  }

  useEffect(() => {
    refreshBacklog()
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
        deleteBacklogTask,
        updateTask,
        reorderTasks,
        updateBacklogPreview,
        clearPreviews
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