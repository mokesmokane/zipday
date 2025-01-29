"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useDate } from "./date-context"
import { useTasks } from "./tasks-context"
import { useBacklog } from "./backlog-context"
import { useGoogleCalendar } from "./google-calendar-context"
import { Task } from "@/types/daily-task-types"
import { format, subDays, parseISO, isWeekend } from "date-fns"
import { createIdMapping, formatTasksContext, formatCalendarEvents } from "@/lib/utils/context-utils"

interface AiContextType {
  context: string;
  idMappings: Record<number, string>;
}

const AiContext = createContext<AiContextType | undefined>(undefined)

export function AiProvider({ children }: { children: React.ReactNode }) {
  const { selectedDate } = useDate()
  const { dailyTasks, incompleteTasks } = useTasks()
  const { backlogTasks } = useBacklog()
  const { events } = useGoogleCalendar()
  const [contextData, setContextData] = useState<AiContextType>({ context: "", idMappings: {} })

  const getLastBusinessDay = (from: Date = new Date()): Date => {
    let date = subDays(from, 1)
    while (isWeekend(date)) {
      date = subDays(date, 1)
    }
    return date
  }

  useEffect(() => {
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
    
    // Format all task sections and collect their ID mappings
    let nextIndex = 1
    const { mapping, reverseMapping } = createIdMapping([...scheduledTasks, ...unscheduledTasks, ...lastBusinessDayTasks, ...backlogTasks])
    const scheduledTasksContext = formatTasksContext("Today's Scheduled Tasks", scheduledTasks, mapping)
    nextIndex += scheduledTasks.length

    const unscheduledTasksContext = formatTasksContext("Today's Unscheduled Tasks", unscheduledTasks, mapping)
    nextIndex += unscheduledTasks.length

      const lastBusinessDayTasksContext = formatTasksContext("Incomplete Tasks from Last Business Day", lastBusinessDayTasks, mapping)
    nextIndex += lastBusinessDayTasks.length

    const backlogTasksContext = formatTasksContext("Backlog Tasks", backlogTasks, mapping)

    // Combine all context
    const context = `
Current Context:

${formatCalendarEvents(todaysEvents)}

${scheduledTasksContext}

${unscheduledTasksContext}

${lastBusinessDayTasksContext}

${backlogTasksContext}
`.trim()

    setContextData({ context, idMappings: reverseMapping })
  }, [selectedDate, dailyTasks, backlogTasks, events])

  return (
    <AiContext.Provider value={contextData}>
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