"use client"

import { useState } from "react"
import { TaskBoard } from "./task-board"
import { updateTaskAction, deleteTaskAction } from "@/actions/db/tasks-actions"
import { useDate } from "@/lib/context/date-context"
import type { Task, Day } from "@/types/daily-task-types"

interface TaskBoardWrapperProps {
  initialTasks: Task[]
  today: Day
}

export function TaskBoardWrapper({ initialTasks, today }: TaskBoardWrapperProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const { selectedDate } = useDate()

  async function handleTaskUpdate(task: Task) {
    try {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t))
      await updateTaskAction(today.date, task.id, task)
    } catch (error) {
      console.error("Failed to update task:", error)
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      setTasks(prev => prev.filter(t => t.id !== taskId))
      await deleteTaskAction(today.date, taskId)
    } catch (error) {
      console.error("Failed to delete task:", error)
    }
  }

  return (
    <TaskBoard
      tasks={tasks}
      today={today}
      selectedDate={selectedDate || new Date()}
      onTaskUpdate={handleTaskUpdate}
      onDeleteTask={handleDeleteTask}
    />
  )
} 