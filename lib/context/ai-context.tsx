"use client"

import { createContext, useContext } from "react"
import { useDate } from "./date-context"
import { useTasks } from "./tasks-context"
import { useBacklog } from "./backlog-context"
import { useGoogleCalendar } from "./google-calendar-context"
import { Task } from "@/types/daily-task-types"
import { format, subDays, parseISO, isWeekend } from "date-fns"

interface AiContextType {
  getAiContext: () => string
}

const AiContext = createContext<AiContextType | undefined>(undefined)

export function AiProvider({ children }: { children: React.ReactNode }) {
  const { selectedDate } = useDate()
  const { dailyTasks, incompleteTasks } = useTasks()
  const { backlogTasks } = useBacklog()
  const { events } = useGoogleCalendar()

  const getLastBusinessDay = (from: Date = new Date()): Date => {
    let date = subDays(from, 1)
    while (isWeekend(date)) {
      date = subDays(date, 1)
    }
    return date
  }

  const formatTasksContext = (title: string, tasks: Task[]) => {
    if (!tasks.length) return ""

    const formattedTasks = tasks.map(task => {
      const metadata = []
      if (task.urgency) metadata.push(`Urgency: ${task.urgency}`)
      if (task.importance) metadata.push(`Importance: ${task.importance}`)
      if (task.durationMinutes) metadata.push(`Duration: ${task.durationMinutes}m`)
      if (task.tags?.length) metadata.push(`Tags: ${task.tags.join(", ")}`)
      if (task.calendarItem?.start?.dateTime) {
        const startTime = format(parseISO(task.calendarItem.start.dateTime), "h:mm a")
        const endTime = task.calendarItem?.end?.dateTime ? 
          format(parseISO(task.calendarItem.end.dateTime), "h:mm a") : 
          undefined
        metadata.push(`Time: ${startTime}${endTime ? ` - ${endTime}` : ""}`)
      }

      let taskStr = `  - [${task.completed ? "x" : " "}] ${task.title}`
      if (task.description) taskStr += `\n    Description: ${task.description}`
      if (metadata.length) taskStr += `\n    (${metadata.join(" | ")})`
      if (task.subtasks?.length) {
        taskStr += "\n    Subtasks:"
        task.subtasks.forEach(subtask => {
          taskStr += `\n    - [${subtask.completed ? "x" : " "}] ${subtask.text}`
        })
      }
      return taskStr
    }).join("\n")

    return `
${title}:
${formattedTasks}
`
  }

  const formatCalendarEvents = (events: any[]) => {
    if (!events.length) return ""

    const formattedEvents = events.map(event => {
      let eventStr = `  - ${event.title}`
      if (event.calendarItem?.start?.dateTime) {
        const startTime = format(parseISO(event.calendarItem.start.dateTime), "h:mm a")
        const endTime = event.calendarItem?.end?.dateTime ? 
          format(parseISO(event.calendarItem.end.dateTime), "h:mm a") : 
          undefined
        eventStr += ` (${startTime}${endTime ? ` - ${endTime}` : ""})`
      }
      if (event.description) eventStr += `\n    Description: ${event.description}`
      return eventStr
    }).join("\n")

    return `
Calendar Events:
${formattedEvents}
`
  }

  const getAiContext = () => {
    const today = format(new Date(), "yyyy-MM-dd")
    const lastBusinessDay = format(getLastBusinessDay(), "yyyy-MM-dd")

    // Get today's calendar events
    const todaysEvents = events?.filter(event => {
      if (!event.calendarItem?.start?.dateTime) return false
      const eventDate = parseISO(event.calendarItem.start.dateTime)
      return format(eventDate, "yyyy-MM-dd") === today
    }) || []

    // Get today's tasks and separate into scheduled and unscheduled
    const todaysTasks = dailyTasks[today]?.tasks || []
    const scheduledTasks = todaysTasks.filter(task => task.calendarItem?.start?.dateTime)
    const unscheduledTasks = todaysTasks.filter(task => !task.calendarItem?.start?.dateTime)

    // Get incomplete tasks from last business day
    const lastBusinessDayTasks = dailyTasks[lastBusinessDay]?.tasks.filter(t => !t.completed) || []
    
    // Get backlog tasks
    const backlogTasksContext = formatTasksContext("Backlog Tasks", backlogTasks)

    // Combine all context
    return `
Current Context:

${formatCalendarEvents(todaysEvents)}

${formatTasksContext("Today's Scheduled Tasks", scheduledTasks)}

${formatTasksContext("Today's Unscheduled Tasks", unscheduledTasks)}

${formatTasksContext("Incomplete Tasks from Last Business Day", lastBusinessDayTasks)}

${backlogTasksContext}
    `.trim()
  }

  return (
    <AiContext.Provider value={{ getAiContext }}>
      {children}
    </AiContext.Provider>
  )
}

export function useAiContext() {
  const context = useContext(AiContext)
  if (!context) {
    throw new Error("useAiContext must be used within an AiProvider")
  }
  return context
} 