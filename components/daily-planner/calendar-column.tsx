"use client"

import { format, isToday, parseISO } from "date-fns"
import type { Task } from "@/types/daily-task-types"
import type { CSSProperties } from "react"
import { useEffect, useState } from "react"
import { useGoogleCalendar } from "@/lib/context/google-calendar-context"
import { CalendarTask } from "./calendar/calendar-task"
import { GoogleCalendarEvent } from "./calendar/google-calendar-event"
import { HourDroppable } from "./calendar/hour-droppable"
import { CurrentTimeLine } from "./calendar/current-time-line"
import { getOverlappingGroups, HOURS } from "./calendar/utils"
import { TimeLabels } from "./calendar/time-labels"
import { AllDayEvent } from "./calendar/all-day-event"

interface CalendarColumnProps {
  id: string
  date: string
  tasks: Task[]
  onAddTask: (hour: number) => void
  onResizeTask?: (taskId: string, durationMinutes: number) => void
  onEventUpdate?: (eventId: string, updates: Partial<{ title: string, startTime: string, endTime: string }>) => void
}

export function CalendarColumn({ id, date, tasks, onAddTask, onResizeTask, onEventUpdate }: CalendarColumnProps) {
  const isCurrentDay = isToday(new Date(date))
  const { events } = useGoogleCalendar()

  // Filter events for this day
  const dayEvents = events?.filter(event => {
    const eventDate = parseISO(event.startTime)
    return format(eventDate, "yyyy-MM-dd") === date
  }) || []

  // Separate all-day and timed events
  const allDayEvents = dayEvents.filter(event => event.allDay)
  const timedEvents = dayEvents.filter(event => !event.allDay)

  // Combine tasks and events for overlap calculation
  const allItems = [...tasks, ...timedEvents]
  const overlappingGroups = getOverlappingGroups(allItems)
  
  // Create a map of item index to its position info
  const positionMap = new Map<number, {index: number, total: number}>()
  overlappingGroups.forEach(group => {
    group.forEach((itemIndex, positionIndex) => {
      positionMap.set(itemIndex, {
        index: positionIndex,
        total: group.length
      })
    })
  })

  return (
    <div className="bg-muted/50 flex h-full w-full flex-col rounded-lg border">
      <div className="border-b p-2 h-[72px] overflow-y-auto">
        {allDayEvents.length > 0 && (
          <div className="space-y-1">
            {allDayEvents.map(event => (
              <AllDayEvent
                key={event.id}
                id={event.id}
                title={event.title}
                startTime={event.startTime}
                endTime={event.endTime}
                description={event.description}
                onEventUpdate={onEventUpdate}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {/* Time labels column */}
        <TimeLabels />
        
        {/* Main calendar grid with absolute positioning */}
        <div className="ml-12 relative">
          {HOURS.map(hour => (
            <HourDroppable
              key={hour}
              id={id}
              hour={hour}
              isOver={false}
            />
          ))}
          
          {tasks.map((task, idx) => {
            const position = positionMap.get(idx) || { index: 0, total: 1 }
            return (
              <CalendarTask 
                key={task.id} 
                task={task}
                onResize={onResizeTask}
                position={position}
              />
            )
          })}

          {timedEvents.map((event, idx) => {
            const position = positionMap.get(idx + tasks.length) || { index: 0, total: 1 }
            return (
              <GoogleCalendarEvent
                key={event.id}
                id={event.id}
                title={event.title}
                startTime={event.startTime}
                endTime={event.endTime}
                position={position}
                onEventUpdate={onEventUpdate}
              />
            )
          })}

          {isCurrentDay && <CurrentTimeLine />}
        </div>
      </div>
    </div>
  )
} 
