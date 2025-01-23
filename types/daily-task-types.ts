export interface Subtask {
  id: string
  text: string
  completed: boolean
}

export interface CalendarDateTime {
  date?: string
  dateTime?: string
  timeZone?: string  
}

export interface CalendarItem {
  gcalEventId?: string
  start: CalendarDateTime
  end?: CalendarDateTime
}

export interface Task {
  id: string
  userId?: string
  title: string
  description?: string
  completed: boolean
  durationMinutes?: number
  subtasks: Subtask[]
  tags?: string[]
  createdAt: string
  updatedAt: string
  calendarItem?: CalendarItem
  isBacklog?: boolean
}

export interface Day {
  id: string
  date: string
  tasks: Task[]
  createdAt: string
  updatedAt: string
}

export type DailyTasks = Record<string, Day>

