export interface Subtask {
  id: string
  text: string
  completed: boolean
}

export interface Task {
  id: string
  userId?: string
  title: string
  description?: string
  completed: boolean
  startTime?: string
  endTime?: string
  durationMinutes?: number
  subtasks: Subtask[]
  tags?: string[]
  order: number
  createdAt: string
  updatedAt: string
  gcalEventId?: string // ID of the corresponding Google Calendar event
}

export interface Day {
  id: string
  date: string
  tasks: Task[]
  createdAt: string
  updatedAt: string
}

export type DailyTasks = Record<string, Day>

