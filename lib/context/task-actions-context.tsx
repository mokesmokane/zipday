"use client"

import { createContext, useContext } from "react"
import {
  addTaskAction as addTaskDb,
  deleteTaskAction as deleteTaskDb,
  updateTaskAction as updateTaskDb,
  reorderDayTasksAction as reorderDayTasksDb,
  setDayTasksAction as setDayTasksDb,
  setBacklogTasksAction as setBacklogTasksDb,
  addBacklogTaskAction as addBacklogTaskDb,
  deleteBacklogTaskAction as deleteBacklogTaskDb,
  updateBacklogTaskAction as updateBacklogTaskDb
} from "@/actions/db/tasks-actions"
import { Task } from "@/types/daily-task-types"
import { useTasks } from "./tasks-context"
import { useBacklog } from "./backlog-context"

interface TaskActionsContextType {
  addTask: typeof addTaskDb
  deleteTask: typeof deleteTaskDb
  updateTask: typeof updateTaskDb
  setDayTasks: typeof setDayTasksDb
  setBacklogTasks: typeof setBacklogTasksDb
  addBacklogTask: typeof addBacklogTaskDb
  deleteBacklogTask: typeof deleteBacklogTaskDb
  updateBacklogTask: typeof updateBacklogTaskDb
  reorderDayTasks: typeof reorderDayTasksDb
  refreshTasks: () => Promise<void>
  refreshBacklog: () => Promise<void>
}

const TaskActionsContext = createContext<TaskActionsContextType | undefined>(
  undefined
)

export function TaskActionsProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { refreshTasks } = useTasks()
  const { refreshBacklog } = useBacklog()

  const value: TaskActionsContextType = {
    addTask: addTaskDb,
    deleteTask: deleteTaskDb,
    updateTask: updateTaskDb,
    setDayTasks: setDayTasksDb,
    setBacklogTasks: setBacklogTasksDb,
    addBacklogTask: addBacklogTaskDb,
    deleteBacklogTask: deleteBacklogTaskDb,
    updateBacklogTask: updateBacklogTaskDb,
    reorderDayTasks: reorderDayTasksDb,
    refreshTasks,
    refreshBacklog
  }

  return (
    <TaskActionsContext.Provider value={value}>
      {children}
    </TaskActionsContext.Provider>
  )
}

export function useTaskActions() {
  const context = useContext(TaskActionsContext)
  if (!context) {
    throw new Error("useTaskActions must be used within a TaskActionsProvider")
  }
  return context
}
