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
  /** 
   * Store the start time as an ISO 8601 string (e.g. "2025-01-13T09:00:00Z")
   * for consistent handling.
   */
  startTime?: string
  /**
   * Store the duration in minutes (e.g. 90 for 1h 30m).
   */
  durationMinutes?: number
  completed: boolean
  subtasks: Subtask[]
  tags?: string[]
  order?: number
  createdAt: string
  updatedAt: string
}

export interface Day {
  id: string
  date: string
  tasks: Task[]
  createdAt: string
  updatedAt: string
}
export interface DateWindow {
  startDate: Date
  endDate: Date
}

export type DailyTasks = Record<string, Day>

