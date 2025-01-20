"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { 
  getBacklogTasksAction, 
  addBacklogTaskAction,
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
  addTask: (task: Task) => Promise<void>
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

  const refreshBacklog = async () => {
    console.log("Refreshing backlog")
    if (!user) {
      setBacklogTasks([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const backlogResult = await getBacklogTasksAction()
    if (backlogResult.isSuccess) {
      console.log("Backlog tasks:", backlogResult.data)
      setBacklogTasks(backlogResult.data || [])
      setError(null)
    } else {
      console.error("Failed to get backlog tasks:", backlogResult.message)
      setError(backlogResult.message)
      setBacklogTasks([])
    }

    setIsLoading(false)
  }

  const addTask = async (task: Task) => {
    // Declare tempTask outside try block
    const tempTask = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    try {
      setBacklogTasks(prev => [...prev, tempTask])
      
      const result = await addBacklogTaskAction(task)
      
      if (result.isSuccess && result.data) {
        setBacklogTasks(prev => 
          prev.map(t => t.id === tempTask.id ? result.data! : t)
        )
        toast({
          title: "Success",
          description: "Task added to backlog",
          variant: "default"
        })
      } else {
        setBacklogTasks(prev => 
          prev.filter(t => t.id !== tempTask.id)
        )
        setError(result.message)
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      setBacklogTasks(prev => 
        prev.filter(t => t.id !== tempTask.id)
      )
      setError("Failed to add task to backlog")
      toast({
        title: "Error",
        description: "Failed to add task to backlog",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const reorderTasks = async (taskIds: string[]) => {
    try {
      console.log("Reordering tasks:", taskIds)
      setIsLoading(true)
      // Optimistically update the UI
      const reorderedTasks = taskIds
        .map(id => backlogTasks.find(t => t.id === id))
        .filter((task): task is Task => task !== undefined)
      setBacklogTasks(reorderedTasks)

      const result = await reorderBacklogTasksAction(taskIds)
      if (!result.isSuccess) {
        // If the backend update fails, revert to original state
        await refreshBacklog()
        setError(result.message)
        toast({
          title: "Error",
          description: "Failed to reorder tasks",
          variant: "destructive"
        })
      }
    } catch (error) {
      // If there's an error, refresh to ensure consistency
      await refreshBacklog()
      setError("Failed to reorder backlog tasks")
      toast({
        title: "Error",
        description: "Failed to reorder backlog tasks",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refreshBacklog()
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
        reorderTasks,
        updateBacklogPreview: () => {},
        clearPreviews: () => {}
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