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

export function TaskBoardWrapper({ today }: TaskBoardWrapperProps) {
  const { selectedDate, setSelectedDate } = useDate()
  return (
    <TaskBoard
      today={today}
      selectedDate={selectedDate || new Date()}
      setSelectedDate={setSelectedDate}
    />
  )
}
