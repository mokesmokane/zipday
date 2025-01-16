"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { getDaysByDateRangeAction, getBacklogTasksAction, getIncompleteTasksAction } from "@/actions/db/tasks-actions"
import { useDate } from "./date-context"
import { useAuth } from "./auth-context"
import { Day, Task } from "@/types/daily-task-types"

/** 
 * If you only need a flat list of tasks, you can keep 'tasks' the same. 
 * If you also want day-level data (like 'meta'), store it in dailyDocs.
 */
interface TasksContextType {
  dailyTasks: Record<string, Day>
  incompleteTasks: Task[] // Past incomplete tasks
  futureTasks: Task[] // Tasks from tomorrow onwards
  backlogTasks: Task[] // Tasks from backlog collection
  isLoading: boolean
  error: string | null
  refreshTasks: () => Promise<void>
}

const TasksContext = createContext<TasksContextType | undefined>(undefined)

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [dailyTasks, setDailyTasks] = useState<Record<string, Day>>({})
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([])
  const [futureTasks, setFutureTasks] = useState<Task[]>([])
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { dateWindow } = useDate()
  const { user } = useAuth()

  /**
   * A function to fetch the tasks for the current date window,
   * and store them in both dailyDocs and tasks (flat list).
   */
  const refreshTasks = async () => {
    if (!user) {
      setDailyTasks({})
      setIncompleteTasks([])
      setFutureTasks([])
      setBacklogTasks([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const startDateStr = dateWindow.startDate.toISOString().split("T")[0]
    const endDateStr = dateWindow.endDate.toISOString().split("T")[0]
    const today = new Date().toISOString().split("T")[0]

    // Get tasks for date range
    const result = await getDaysByDateRangeAction(startDateStr, endDateStr)

    if (result.isSuccess) {
      // Convert the array of days to a dictionary keyed by date
      const daysByDate: Record<string, Day> = {}
      const future: Task[] = []

      for (const day of result.data || []) {
        daysByDate[day.date] = day
        
        // Only categorize future tasks now
        if (day.date > today) {
          future.push(...day.tasks)
        }
      }

      setDailyTasks(daysByDate)
      setFutureTasks(future)

      // Get incomplete tasks in a separate call - from start of range to today
      const incompleteResult = await getIncompleteTasksAction(startDateStr, today)
      if (incompleteResult.isSuccess) {
        setIncompleteTasks(incompleteResult.data || [])
      }

      // Get backlog tasks
      const backlogResult = await getBacklogTasksAction()
      if (backlogResult.isSuccess) {
        setBacklogTasks(backlogResult.data || [])
      }

      setError(null)
    } else {
      setError(result.message)
      setDailyTasks({})
      setIncompleteTasks([])
      setFutureTasks([])
      setBacklogTasks([])
    }

    setIsLoading(false)
  }

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
        backlogTasks,
        isLoading,
        error,
        refreshTasks
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
