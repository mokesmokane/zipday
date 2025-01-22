"use client"

import { createContext, useContext, useEffect, useState, useRef } from "react"
import { getDaysByDateRangeAction, getIncompleteTasksAction } from "@/actions/db/tasks-actions"
import { useDate } from "./date-context"
import { useAuth } from "./auth-context"
import { Day, Task } from "@/types/daily-task-types"
import { addTaskAction, updateTaskAction, deleteTaskAction, reorderDayTasksAction } from "@/actions/db/tasks-actions"
import { toast } from "@/components/ui/use-toast"

/** 
 * If you only need a flat list of tasks, you can keep 'tasks' the same. 
 * If you also want day-level data (like 'meta'), store it in dailyDocs.
 */
interface TasksContextType {
  dailyTasks: Record<string, Day>
  incompleteTasks: Task[] // Past incomplete tasks
  futureTasks: Task[] // Tasks from tomorrow onwards
  isLoading: boolean
  error: string | null
  refreshTasks: () => Promise<void>
  addTask: (date: string, task: Task, insertIndex?: number) => Promise<void>
  updateTask: (date: string, taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (date: string, taskId: string) => Promise<void>
  reorderDayTasks: (date: string, taskIds: string[]) => Promise<void>
}

const TasksContext = createContext<TasksContextType | undefined>(undefined)

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [dailyTasks, setDailyTasks] = useState<Record<string, Day>>({})
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([])
  const [futureTasks, setFutureTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { dateWindow } = useDate()
  const { user } = useAuth()

  // Keep refs of old data so we can do a shallow compare
  const prevDailyTasksRef = useRef(dailyTasks)
  const prevIncompleteRef = useRef(incompleteTasks)
  const prevFutureRef = useRef(futureTasks)

  /**
   * A function to fetch the tasks for the current date window,
   * and store them in both dailyDocs and tasks (flat list).
   */
  const refreshTasks = async () => {
    console.log("refreshTasks -> user:", user)
    console.log("dateWindow", dateWindow)

    // If user is null, just clear tasks once (if not already cleared)
    if (!user) {
      // If we already have empty data, skip
      const alreadyEmpty =
        Object.keys(dailyTasks).length === 0 &&
        incompleteTasks.length === 0 &&
        futureTasks.length === 0

      if (!alreadyEmpty) {
        console.log("[TasksContext] Clearing tasks because user is null.")
        setDailyTasks({})
        setIncompleteTasks([])
        setFutureTasks([])
      }
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const startDateStr = dateWindow.startDate.toISOString().split("T")[0]
    const endDateStr = dateWindow.endDate.toISOString().split("T")[0]
    const todayStr = new Date().toISOString().split("T")[0]

    try {
      // Get tasks for date range
      const result = await getDaysByDateRangeAction(startDateStr, endDateStr)
      console.log("getDaysByDateRangeAction result:", result)

      if (result.isSuccess && result.data) {
        // Convert the array of days to a dictionary keyed by date
        const daysByDate: Record<string, Day> = {}
        const future: Task[] = []

        for (const day of result.data) {
          daysByDate[day.date] = day
          // Only categorize future tasks
          if (day.date > todayStr) {
            future.push(...day.tasks)
          }
        }

        // We also get incomplete tasks in a separate call
        const incompleteResult = await getIncompleteTasksAction(
          startDateStr,
          todayStr
        )

        let newIncomplete: Task[] = []
        if (incompleteResult.isSuccess && incompleteResult.data) {
          newIncomplete = incompleteResult.data
        }

        // Before setting, check if it's actually changed
        const tasksChanged =
          JSON.stringify(daysByDate) !== JSON.stringify(prevDailyTasksRef.current)
        const futureChanged =
          JSON.stringify(future) !== JSON.stringify(prevFutureRef.current)
        const incompleteChanged =
          JSON.stringify(newIncomplete) !==
          JSON.stringify(prevIncompleteRef.current)

        // Update state only if changed (prevents extra re-renders)
        if (tasksChanged) {
          setDailyTasks(daysByDate)
          prevDailyTasksRef.current = daysByDate
        }
        if (futureChanged) {
          setFutureTasks(future)
          prevFutureRef.current = future
        }
        if (incompleteChanged) {
          setIncompleteTasks(newIncomplete)
          prevIncompleteRef.current = newIncomplete
        }
      } else {
        setError(result.message || "Failed to load tasks")
      }
    } catch (err) {
      console.error("Error in refreshTasks:", err)
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while refreshing tasks"
      )
    } finally {
      setIsLoading(false)
    }
  }

  const addTask = async (date: string, task: Task, insertIndex?: number) => {
    const tempTask: Task = {
      ...task,
      id: task.id || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Optimistic update
    setDailyTasks(prev => ({
      ...prev,
      [date]: {
        id: prev[date]?.id || crypto.randomUUID(),
        date,
        tasks: insertIndex !== undefined ? [...(prev[date]?.tasks || []).slice(0, insertIndex), tempTask, ...(prev[date]?.tasks || []).slice(insertIndex)] :  [...(prev[date]?.tasks || []), tempTask],
        createdAt: prev[date]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }))

    try {
      const result = await addTaskAction(date, tempTask, insertIndex)
      if (!result.isSuccess) {
        // Revert on failure
        await refreshTasks()
      }
    } catch (error) {
      await refreshTasks()
    }
  }

  const updateTask = async (date: string, taskId: string, updates: Partial<Task>) => {
    // Optimistic update
    setDailyTasks(prev => ({
      ...prev,
      [date]: {
        id: prev[date]?.id || crypto.randomUUID(),
        date,
        tasks: prev[date]?.tasks.map(t => 
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        ) || [],
        createdAt: prev[date]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }))

    try {
      const result = await updateTaskAction(date, taskId, updates)
      if (!result.isSuccess) {
        // Revert on failure
        await refreshTasks()
      }
    } catch (error) {
      await refreshTasks()
    }
  }

  const deleteTask = async (date: string, taskId: string) => {
    // Optimistic delete
    setDailyTasks(prev => ({
      ...prev,
      [date]: {
        id: prev[date]?.id || crypto.randomUUID(),
        date,
        tasks: prev[date]?.tasks.filter(t => t.id !== taskId) || [],
        createdAt: prev[date]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }))

    try {
      const result = await deleteTaskAction(date, taskId)
      if (!result.isSuccess) {
        // Revert on failure
        await refreshTasks()
      }
    } catch (error) {
      await refreshTasks()
    }
  }

  const reorderDayTasks = async (date: string, taskIds: string[]) => {
    // Optimistic reorder
    setDailyTasks(prev => {
      const currentTasks = prev[date]?.tasks || []
      const reorderedTasks = taskIds
        .map(id => currentTasks.find(t => t.id === id))
        .filter((task): task is Task => task !== undefined)

      return {
        ...prev,
        [date]: {
          id: prev[date]?.id || crypto.randomUUID(),
          date,
          tasks: reorderedTasks,
          createdAt: prev[date]?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    })

    try {
      const result = await reorderDayTasksAction(date, taskIds)
      if (!result.isSuccess) {
        // Revert on failure
        await refreshTasks()
      }
    } catch (error) {
      await refreshTasks()
    }
  }

  // On mount, or when user or dateWindow changes, refresh tasks
  useEffect(() => {
    void refreshTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateWindow.startDate, dateWindow.endDate])

  return (
    <TasksContext.Provider
      value={{
        dailyTasks,
        incompleteTasks,
        futureTasks,
        isLoading,
        error,
        refreshTasks,
        addTask,
        updateTask,
        deleteTask,
        reorderDayTasks
      }}
    >
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks() {
  const context = useContext(TasksContext)
  if (!context) {
    throw new Error("useTasks must be used within a TasksProvider")
  }
  return context
}