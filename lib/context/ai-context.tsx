"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useDate } from "./date-context"
import { useTasks } from "./tasks-context"
import { useBacklog } from "./backlog-context"
import { useGoogleCalendar } from "./google-calendar-context"
import { format, subDays, parseISO, isWeekend } from "date-fns"
import {
  createIdMapping,
  formatTasksContext,
  formatCalendarEvents
} from "@/lib/utils/context-utils"

export enum ContextType {
  CALENDAR = "CALENDAR",
  DAILY_PLANNER = "DAILY_PLANNER",
  TASK_BOARD = "TASK_BOARD"
}

interface AiContextType {
  name: ContextType
  text: string
  idMappings: Record<string, string>
  setContextType: (type: ContextType) => void
}

const AiContext = createContext<AiContextType | undefined>(undefined)

export function AiProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { selectedDate } = useDate()
  const { dailyTasks, incompleteTasks } = useTasks()
  const { backlogTasks } = useBacklog()
  const { events } = useGoogleCalendar()
  const [manualContextType, setManualContextType] = useState<ContextType | null>(null)
  const [contextData, setContextData] = useState<Omit<AiContextType, 'setContextType'>>({
    name: ContextType.TASK_BOARD,
    text: "",
    idMappings: {}
  })

  const getLastBusinessDay = (from: Date = new Date()): Date => {
    let date = subDays(from, 1)
    while (isWeekend(date)) {
      date = subDays(date, 1)
    }
    return date
  }

  // Determine context type based on pathname or manual override
  const getContextType = (pathname: string | null) => {
    if (manualContextType !== null) {
      return manualContextType
    }

    if (pathname?.includes("/dashboard/calendar")) {
      return ContextType.CALENDAR
    } else if (pathname?.includes("/dashboard/todo")) {
      return ContextType.DAILY_PLANNER
    }
    return ContextType.TASK_BOARD
  }

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd")
    const lastBusinessDay = format(getLastBusinessDay(), "yyyy-MM-dd")

    // Get today's calendar events
    const todaysEvents =
      events?.filter(event => {
        if (!event.calendarItem?.start?.dateTime) return false
        const eventDate = parseISO(event.calendarItem.start.dateTime)
        return format(eventDate, "yyyy-MM-dd") === today
      }) || []

    // Get today's tasks and separate into scheduled and unscheduled
    const todaysTasks = dailyTasks[today]?.tasks || []
    const scheduledTasks = todaysTasks.filter(
      task => task.calendarItem?.start?.dateTime
    )
    const unscheduledTasks = todaysTasks.filter(
      task => !task.calendarItem?.start?.dateTime
    )

    // Get incomplete tasks from last business day
    const lastBusinessDayTasks =
      dailyTasks[lastBusinessDay]?.tasks.filter(t => !t.completed) || []

    // Format all task sections and collect their ID mappings
    const allTasks = Object.values(dailyTasks).flatMap(day => day.tasks)
    const { mapping, reverseMapping } = createIdMapping([
      ...allTasks,
      ...backlogTasks
    ])

    let contextSections: string[] = []

    const contextType = getContextType(pathname)

    // Build context sections based on context type
    switch (contextType) {
      case ContextType.CALENDAR:
        contextSections = [
          formatCalendarEvents(todaysEvents),
          formatTasksContext(
            "Today's Scheduled Tasks",
            scheduledTasks,
            mapping
          )
        ]
        break
      
      case ContextType.DAILY_PLANNER:
        // Add calendar events first
        contextSections.push(formatCalendarEvents(todaysEvents))

        // Add each date's tasks
        Object.entries(dailyTasks)
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
          .forEach(([dateStr, day]) => {
            if (!day?.tasks?.length) return

            const dateScheduledTasks = day.tasks.filter(
              task => task.calendarItem?.start?.dateTime
            )
            const dateUnscheduledTasks = day.tasks.filter(
              task => !task.calendarItem?.start?.dateTime
            )

            const dayTitle = dateStr === today 
              ? `Tasks for ${format(new Date(dateStr), "EEEE, MMMM d")} [Today]`
              : `Tasks for ${format(new Date(dateStr), "EEEE, MMMM d")}`

            const dayTasks = [
              ...dateScheduledTasks.map(task => ({
                ...task,
                title: `${task.title} (Scheduled for ${format(new Date(task.calendarItem?.start?.dateTime || ''), "h:mm a")})`
              })),
              ...dateUnscheduledTasks.map(task => ({
                ...task,
                title: `${task.title} (Unscheduled)`
              }))
            ]

            contextSections.push(formatTasksContext(dayTitle, dayTasks, mapping))
          })
        break
      
      case ContextType.TASK_BOARD:
      default:
        contextSections = [
          formatCalendarEvents(todaysEvents),
          formatTasksContext(
            "Today's Scheduled Tasks",
            scheduledTasks,
            mapping
          ),
          formatTasksContext(
            "Today's Unscheduled Tasks",
            unscheduledTasks,
            mapping
          ),
          formatTasksContext(
            "Incomplete Tasks from Last Business Day",
            lastBusinessDayTasks,
            mapping
          ),
          formatTasksContext(
            "Backlog Tasks",
            backlogTasks,
            mapping
          )
        ]
        break
    }

    // Combine all context sections
    const context = `
Current Context:

${contextSections.join("\n\n")}

The current date is ${format(new Date(), "yyyy-MM-dd")}
The time is ${format(new Date(), "h:mm a")}
`.trim()

    setContextData({ 
      name: contextType,
      text: context, 
      idMappings: reverseMapping 
    })
  }, [selectedDate, dailyTasks, backlogTasks, events, pathname, manualContextType])

  const contextValue: AiContextType = {
    ...contextData,
    setContextType: setManualContextType
  }

  return <AiContext.Provider value={contextValue}>{children}</AiContext.Provider>
}

export function useAiContext() {
  const context = useContext(AiContext)
  if (!context) {
    throw new Error("useAiContext must be used within an AiProvider")
  }
  return context
}
