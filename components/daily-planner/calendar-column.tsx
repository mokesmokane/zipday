"use client"

import { format, isToday, parseISO } from "date-fns"
import type { Task } from "@/types/daily-task-types"
import { useGoogleCalendar } from "@/lib/context/google-calendar-context"
import { CalendarTask } from "./calendar/calendar-task"
import { GoogleCalendarEvent } from "./calendar/google-calendar-event"
import { HourDroppable } from "./calendar/hour-droppable"
import { CurrentTimeLine } from "./calendar/current-time-line"
import { getOverlappingGroups, HOURS } from "./calendar/utils"
import { TimeLabels } from "./calendar/time-labels"
import { AllDayEvent } from "./calendar/all-day-event"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Trash2 } from "lucide-react"
import { useState } from "react"

interface CalendarColumnProps {
  id: string
  date: string
  tasks: Task[]
  singleColumn?: boolean
  onScheduleTask?: (hour: number) => void
  onAddTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onResizeTask?: (taskId: string, durationMinutes: number) => void
  onEventUpdate?: (
    id: string,
    updates: Partial<{
      title: string
      startTime: string
      endTime: string
      description: string
    }>
  ) => void
  onTaskUpdate?: (task: Task) => void
}

export function CalendarColumn({
  id,
  date,
  tasks,
  singleColumn,
  onScheduleTask,
  onAddTask,
  onDeleteTask,
  onResizeTask,
  onEventUpdate,
  onTaskUpdate
}: CalendarColumnProps) {
  const isCurrentDay = isToday(new Date(date))
  const { events, deleteEvent } = useGoogleCalendar()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Filter events for this day
  const dayEvents =
    events?.filter(event => {
      const eventDate = parseISO(event.calendarItem?.start?.dateTime!)
      return format(eventDate, "yyyy-MM-dd") === date
    }) || []

  // Separate all-day and timed events
  const allDayEvents = dayEvents.filter(event => event.allDay)
  const timedEvents = dayEvents
    .filter(event => !event.allDay)
    .filter(
      event => !tasks.some(task => task.calendarItem?.gcalEventId === event.id)
    )

  // Combine tasks and events for overlap calculation
  const allItems = [...tasks, ...timedEvents]
  const overlappingGroups = getOverlappingGroups(allItems)

  // Create a map of item index to its position info
  const positionMap = new Map<number, { index: number; total: number }>()
  overlappingGroups.forEach(group => {
    group.forEach((itemIndex, positionIndex) => {
      positionMap.set(itemIndex, {
        index: positionIndex,
        total: group.length
      })
    })
  })

  const handleDeleteAllEvents = async () => {
    try {
      // Delete all events for this day
      await Promise.all(dayEvents.map(event => deleteEvent(event.id)))
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Failed to delete events:", error)
    }
  }

  return (
    <div className="bg-muted/50 flex h-[calc(100vh-8rem)] flex-col rounded-lg border">
      <div className="flex h-[72px] items-center justify-between border-b p-2">
        <div className="space-y-1">
          {allDayEvents.length > 0 && (
            <div className="space-y-1">
              {allDayEvents.map(event => (
                <AllDayEvent
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  description={event.description}
                  onEventUpdate={onEventUpdate}
                />
              ))}
            </div>
          )}
        </div>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              disabled={dayEvents.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete All Calendar Events</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete all calendar events for {format(new Date(date), "MMMM d, yyyy")}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteAllEvents}>
                Delete All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="scrollbar-hide relative min-h-0 flex-1 overflow-y-auto">
        {/* Time labels column */}
        <TimeLabels />

        {/* Main calendar grid with absolute positioning */}
        <div className="relative ml-12">
          {HOURS.map(hour => (
            <HourDroppable key={hour} id={id} hour={hour} />
          ))}

          {tasks.map((task, idx) => {
            const position = positionMap.get(idx) || { index: 0, total: 1 }
            return (
              <CalendarTask
                id={singleColumn ? `calendar-${task.id}` : task.id}
                key={task.id}
                task={task}
                position={position}
                onResize={onResizeTask}
                day={{
                  date,
                  tasks,
                  id: "",
                  createdAt: "",
                  updatedAt: ""
                }}
                onTaskUpdate={onTaskUpdate}
                onDeleteTask={onDeleteTask}
              />
            )
          })}

          {timedEvents.map((event, idx) => {
            const position = positionMap.get(idx + tasks.length) || {
              index: 0,
              total: 1
            }
            return (
              <GoogleCalendarEvent
                key={event.id}
                id={event.id}
                title={event.title}
                startTime={event.calendarItem?.start?.dateTime!}
                endTime={event.calendarItem?.end?.dateTime!}
                position={position}
                onEventUpdate={onEventUpdate}
                onAddTask={onAddTask}
              />
            )
          })}

          {isCurrentDay && <CurrentTimeLine />}
        </div>
      </div>
    </div>
  )
}
