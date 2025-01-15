"use client"

import { useState, useEffect, useRef } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { format } from "date-fns"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { v4 as uuidv4 } from "uuid"

import { Button } from "@/components/ui/button"
import { TaskColumn } from "./task-column"
import { TaskCard } from "./task-card"

import { useDate } from "@/lib/context/date-context"
import { useTasks } from "@/lib/context/tasks-context"
import {
  updateTaskAction,
  addTaskAction,
  deleteTaskAction
} from "@/actions/db/tasks-actions"
import { updateCalendarItemAction } from "@/actions/db/calendar-actions"
import type { Day, Task, DailyTasks, CalendarItem } from "@/types/daily-task-types"
import { EditTaskDialog } from "./edit-task-dialog"
import { useFilter } from "@/lib/context/filter-context"
import { useCurrentView } from "@/lib/context/current-view-context"
import { CalendarColumn } from "./calendar-column"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { useGoogleCalendar } from "@/lib/context/google-calendar-context"

const SCROLL_PADDING = 40

const dropAnimationConfig = {
  duration: 200,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)"
}

// Utility: get "calendar-YYYY-MM-DD-hour-H" date
function getDateFromCalendarId(id: string): string {
  const parts = id.split("-")
  // e.g. "calendar-2025-01-11-hour-8" => year=2025, month=01, day=11
  const year = parts[1]
  const month = parts[2]
  const day = parts[3]
  return `${year}-${month}-${day}`
}

// Format hours -> "hh:mm" for display
function createStartTimeISO(dateString: string, hour: number): string {
  const dateObj = new Date(dateString)
  dateObj.setHours(hour, 0, 0, 0)
  return dateObj.toISOString()
}

function getTargetDate(
  id: string,
  columns: Array<{ date: string; tasks: Task[] }>
) {
  if (columns.some(col => col.date === id)) {
    return id
  }
  if (id.startsWith("calendar-")) {
    return getDateFromCalendarId(id)
  }
  const column = columns.find(col => col.tasks.some(t => t.id === id))
  return column?.date
}

export default function DailyPlanner() {
  const {
    loadDates,
    addToStartOfDateWindow,
    addToEndOfDateWindow,
    isLoading: isLoadingDates,
    days
  } = useDate()
  const { dailyTasks, isLoading: isLoadingTasks } = useTasks()
  const { setAvailableTags } = useFilter()
  const { activeFilters } = useFilter()
  const { currentView } = useCurrentView()
  const { updateEvent } = useGoogleCalendar()
  const [localDailyTasks, setLocalDailyTasks] = useState<Record<string, Day>>({})
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [dragStartDate, setDragStartDate] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const prevLocalDailyTasksRef = useRef<Record<string, Day> | null>(null)

  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false)
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isOverCalendarZone, setIsOverCalendarZone] = useState<string | null>(null)
  const [previewColumnDate, setPreviewColumnDate] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState<string | null>(null)
  const { selectedDate, setSelectedDate } = useDate()
  const debouncedCalendarZone = useDebounce(isOverCalendarZone, 1000)

  useEffect(() => {
    if (debouncedCalendarZone) {
      setShowCalendar(debouncedCalendarZone)
    } else {
      setShowCalendar(null)
    }
  }, [debouncedCalendarZone])

  // Sync local state with global tasks
  useEffect(() => {
    setLocalDailyTasks(dailyTasks)
  }, [dailyTasks])

  // Gather all tags for the filter
  useEffect(() => {
    const allTags = new Set<string>()
    Object.values(dailyTasks as DailyTasks).forEach(dailyDoc => {
      dailyDoc.tasks.forEach(task => {
        task.tags?.forEach(tag => allTags.add(tag))
      })
    })
    setAvailableTags(Array.from(allTags))
  }, [dailyTasks, setAvailableTags])

  // Build columns with filters
  const columns = days.map(dateStr => {
    const doc = localDailyTasks[dateStr] ?? {
      tasks: [],
      id: "",
      date: dateStr,
      createdAt: "",
      updatedAt: ""
    } as Day
    const filteredTasks =
      activeFilters.length > 0
        ? doc.tasks.filter(task =>
            task.tags?.some(tag => activeFilters.includes(tag))
          )
        : doc.tasks
    return {
      date: dateStr,
      tasks: filteredTasks || [],
      id: doc.id,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function findTaskById(
    id: string
  ): { date: string; task: Task } | null {
    for (const [date, dailyDoc] of Object.entries(localDailyTasks)) {
      const found = dailyDoc.tasks.find(t => t.id === id)
      if (found) {
        return { date, task: found }
      }
    }
    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setIsDragging(true)
    setActiveId(active.id as string)

    // Handle task dragging
    const task = findTaskById(active.id as string)
    if (task) {
      setActiveTask(task.task)
      setDragStartDate(task.date)
      setPreviewColumnDate(task.date)
      prevLocalDailyTasksRef.current = structuredClone(localDailyTasks)
      return
    }

    // Handle calendar event dragging
    const activeData = active.data.current
    if (activeData?.type === "calendar-event") {
      const event = activeData.event
      setActiveTask({
        id: event.id,
        title: event.title,
        calendarItem: {
          start: {
            date: format(new Date(event.startTime), "yyyy-MM-dd"),
            dateTime: event.startTime,
          }
        },
        description: event.description,
        durationMinutes: Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000),
        completed: false,
        tags: [],
        subtasks: [],
        createdAt: "",
        updatedAt: ""
      })
      setDragStartDate(format(new Date(event.startTime), "yyyy-MM-dd"))
      setPreviewColumnDate(format(new Date(event.startTime), "yyyy-MM-dd"))
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || !activeTask || !dragStartDate) return

    const activeId = active.id as string
    const overId = over.id as string

    // Check calendar zone
    if (over.id === `${dragStartDate}-calendar-zone`) {
      setIsOverCalendarZone(dragStartDate)
      return
    }

    // Check if over a calendar hour
    const isOverCalendarHour = overId.match(/calendar-(.+)-hour-(\d+)/)
    const isOverCalendarColumn = overId.startsWith("calendar-")

    if (isOverCalendarHour || isOverCalendarColumn) {
      const targetDate = isOverCalendarHour
        ? getDateFromCalendarId(overId)
        : getDateFromCalendarId(overId)
      setIsOverCalendarZone(targetDate)
    } else {
      setIsOverCalendarZone(null)
    }

    // Preview dropping into a calendar hour
    if (isOverCalendarHour) {
      const [, fullDate, hourStr] = isOverCalendarHour
      const hour = parseInt(hourStr, 10)

      // Update the task startTime for preview
      const updatedTask:Task = {
        ...activeTask,
        calendarItem: {
          start: {
            date: fullDate,
            dateTime: createStartTimeISO(fullDate, hour)
          }
        }
      }

      setLocalDailyTasks(prev => {
        const updated = structuredClone(prev)

        // Remove from all dates for preview
        Object.keys(updated).forEach(date => {
          if (date !== fullDate) {
            updated[date] = {
              ...updated[date],
              tasks: updated[date].tasks.filter(t => t.id !== activeId)
            }
          }
        })

        // Add to preview date
        if (!updated[fullDate]) {
          updated[fullDate] = {
            tasks: [],
            date: fullDate,
            id: "",
            createdAt: "",
            updatedAt: ""
          }
        }

        const existingTaskIndex = updated[fullDate].tasks.findIndex(
          t => t.id === activeId
        )
        if (existingTaskIndex !== -1) {
          updated[fullDate].tasks[existingTaskIndex] = updatedTask
        } else {
          updated[fullDate].tasks = [...updated[fullDate].tasks, updatedTask]
        }

        return updated
      })

      setPreviewColumnDate(fullDate)
      return
    }

    // Preview normal column drops
    const newCol = columns.find(
      col => col.date === overId || col.tasks.some(t => t.id === overId)
    )
    if (!newCol) return

    setLocalDailyTasks(prev => {
      const updated = structuredClone(prev)

      // Remove from all dates for preview
      Object.keys(updated).forEach(date => {
        if (date !== newCol.date) {
          updated[date] = {
            ...updated[date],
            tasks: updated[date].tasks.filter(t => t.id !== activeId)
          }
        }
      })

      // Add to preview date
      if (!updated[newCol.date]) {
        updated[newCol.date] = {
          tasks: [],
          date: newCol.date,
          id: "",
          createdAt: "",
          updatedAt: ""
        }
      }

      const overIndex = newCol.tasks.findIndex(t => t.id === overId)
      const indexToInsert =
        overIndex >= 0 ? overIndex : updated[newCol.date].tasks.length

      const existingTaskIndex = updated[newCol.date].tasks.findIndex(
        t => t.id === activeId
      )
      if (existingTaskIndex !== -1) {
        updated[newCol.date].tasks[existingTaskIndex] = activeTask
      } else {
        updated[newCol.date].tasks.splice(indexToInsert, 0, activeTask)
      }

      return updated
    })

    setPreviewColumnDate(newCol.date)
  }

  async function deleteTask(taskId: string, date: string) {
    setLocalDailyTasks(prev => {
      const updated = structuredClone(prev)
      updated[date].tasks = updated[date].tasks.filter(t => t.id !== taskId)
      return updated
    })

    await deleteTaskAction(date, taskId)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setPreviewColumnDate(null)
    setIsDragging(false)
    setActiveId(null)
    setActiveTask(null)
    setDragStartDate(null)
    setIsOverCalendarZone(null)

    if (!over || !activeTask || !dragStartDate) {
      return
    }

    const overId = over.id.toString()
    const isOverCalendarHour = overId.match(/calendar-(.+)-hour-(\d+)/)

    try {
      // Handle calendar hour drop
      if (isOverCalendarHour) {
        const [, fullDate, hourStr] = isOverCalendarHour
        const hour = parseInt(hourStr, 10)

        // If dragging a calendar event
        const activeData = active.data.current
        if (activeData?.type === "calendar-event") {
          const event = activeData.event
          const startDate = new Date(event.startTime)
          const endDate = new Date(event.endTime)
          const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)

          const newStartTime = createStartTimeISO(fullDate, hour)
          const newEndTime = new Date(new Date(newStartTime).getTime() + durationMinutes * 60000).toISOString()

          // Update the event through the context
          await updateEvent(event.id, {
            startTime: newStartTime,
            endTime: newEndTime
          })
          return
        }

        // Handle task drop to calendar
        const dateTime = createStartTimeISO(fullDate, hour)
        var calendarItem: CalendarItem = {
          gcalEventId: activeTask.calendarItem?.gcalEventId?.replace(/-/g, '') || uuidv4().replace(/-/g, ''),
          start: {
            date: fullDate,
            dateTime: dateTime
          }
        }

        // Add end time if task already had end time
        if (activeTask.calendarItem?.end) {
          const endDate = new Date(activeTask.calendarItem.end.dateTime!)
          const durationMinutes = Math.round((endDate.getTime() - new Date(activeTask.calendarItem.start.dateTime!).getTime()) / 60000)
          const newEndTime = new Date(new Date(dateTime).getTime() + durationMinutes * 60000).toISOString()
          calendarItem = {
            ...calendarItem,
            end: {
              date: fullDate,
              dateTime: newEndTime
            }
          }
        }

        // Update local state first
        setLocalDailyTasks(prev => {
          const updated = structuredClone(prev)

          // Remove from original date if different
          if (dragStartDate && dragStartDate !== fullDate && updated[dragStartDate]) {
            updated[dragStartDate] = {
              ...updated[dragStartDate],
              tasks: updated[dragStartDate].tasks.filter(t => t.id !== activeTask.id)
            }
          }

          // Add/update in new date
          if (!updated[fullDate]) {
            updated[fullDate] = {
              tasks: [],
              date: fullDate,
              id: "",
              createdAt: "",
              updatedAt: ""
            }
          }

          const updatedTask = {
            ...activeTask,
            calendarItem
          }

          const existingTaskIndex = updated[fullDate].tasks.findIndex(
            t => t.id === activeTask.id
          )
          if (existingTaskIndex !== -1) {
            updated[fullDate].tasks[existingTaskIndex] = updatedTask
          } else {
            updated[fullDate].tasks = [...updated[fullDate].tasks, updatedTask]
          }

          return updated
        })

        // Update task and calendar separately
        if (dragStartDate === fullDate) {
          // Same day - update task and calendar
          await updateTaskAction(fullDate, activeTask.id, activeTask)
          await updateCalendarItemAction(activeTask.id, fullDate, calendarItem)
        } else {
          // Different day - delete from old, add to new, and update calendar
          await deleteTaskAction(dragStartDate, activeTask.id)
          await addTaskAction(fullDate, {
            ...activeTask,
            calendarItem
          })
          await updateCalendarItemAction(activeTask.id, fullDate, calendarItem)
        }
        return
      }

      // Handle normal column drops (existing code)
      const targetDate = getTargetDate(overId, columns)
      if (!targetDate) {
        throw new Error("Could not find target date")
      }

      // Update local state first
      setLocalDailyTasks(prev => {
        const updated = structuredClone(prev)

        // Remove from original date
        if (dragStartDate && updated[dragStartDate]) {
          updated[dragStartDate] = {
            ...updated[dragStartDate],
            tasks: updated[dragStartDate].tasks.filter(
              t => t.id !== activeTask.id
            )
          }
        }

        // Add to new date
        if (!updated[targetDate]) {
          updated[targetDate] = {
            tasks: [],
            date: targetDate,
            id: "",
            createdAt: "",
            updatedAt: ""
          }
        }

        const overIndex =
          columns.find(col => col.date === targetDate)?.tasks.findIndex(
            t => t.id === overId
          ) ?? -1
        const indexToInsert =
          overIndex >= 0
            ? overIndex
            : updated[targetDate].tasks.length

        const existingTaskIndex = updated[targetDate].tasks.findIndex(
          t => t.id === activeTask.id
        )
        if (existingTaskIndex !== -1) {
          updated[targetDate].tasks[existingTaskIndex] = activeTask
        } else {
          updated[targetDate].tasks.splice(indexToInsert, 0, activeTask)
        }

        return updated
      })

      // Then update Firestore
      if (dragStartDate === targetDate) {
        await saveDayChangesToFirestore(targetDate, localDailyTasks[targetDate])
      } else {
        await saveDayChangesToFirestore(targetDate, localDailyTasks[targetDate])
        if (localDailyTasks[dragStartDate]) {
          await saveDayChangesToFirestore(
            dragStartDate,
            localDailyTasks[dragStartDate]
          )
        }
      }
    } catch (error) {
      console.error("Failed to save changes:", error)
      if (prevLocalDailyTasksRef.current) {
        setLocalDailyTasks(prevLocalDailyTasksRef.current)
      }
    }
  }

  async function saveDayChangesToFirestore(dateStr: string, dayData: Day) {
    try {
      const prevDay = prevLocalDailyTasksRef.current?.[dateStr]
      const prevTaskIds = new Set(prevDay?.tasks?.map(t => t.id) || [])
      const currentTaskIds = new Set(dayData?.tasks?.map(t => t.id) || [])
      const tasksToUpdate = dayData?.tasks?.filter(t => prevTaskIds.has(t.id)) || []
      const tasksToAdd = dayData?.tasks?.filter(t => !prevTaskIds.has(t.id)) || []
      const tasksToDelete =
        prevDay?.tasks?.filter(t => !currentTaskIds.has(t.id)) || []

      for (const task of tasksToUpdate) {
        const { id, createdAt, updatedAt, ...updates } = task
        await updateTaskAction(dateStr, id, updates)
      }

      for (const task of tasksToAdd) {
        await addTaskAction(dateStr, task)
      }

      for (const task of tasksToDelete) {
        await deleteTaskAction(dateStr, task.id)
      }
    } catch (error) {
      console.error("Error saving day to Firestore:", error)
      throw error
    }
  }

  async function addTask(dateStr: string) {
    setNewTaskDate(dateStr)
    setIsNewTaskDialogOpen(true)
  }

  function scrollToDate(dateStr: string) {
    const container = containerRef.current
    if (!container) {
      loadDates(new Date(dateStr))
      return
    }
    const columnElement = document.getElementById(dateStr)
    if (!columnElement) return
    const scrollLeft =
      columnElement.offsetLeft -
      container.offsetWidth / 2 +
      columnElement.offsetWidth / 2
    container.scrollTo({ left: scrollLeft, behavior: "smooth" })
  }

  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (selectedDate) {
      scrollToDate(format(selectedDate, "yyyy-MM-dd"))
    }
  }, [selectedDate, columns])

  const isLoading = isLoadingDates || isLoadingTasks

  function handleLeftClick() {
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setDate(newDate.getDate() - 3)
      setSelectedDate(newDate)
      const formattedNewDate = format(newDate, "yyyy-MM-dd")
      if (!columns.some(col => col.date === formattedNewDate)) {
        addToStartOfDateWindow()
      }
    }
  }

  function handleRightClick() {
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setDate(newDate.getDate() + 3)
      setSelectedDate(newDate)
      const formattedNewDate = format(newDate, "yyyy-MM-dd")
      if (!columns.some(col => col.date === formattedNewDate)) {
        addToEndOfDateWindow()
      }
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (container.scrollLeft < 100) {
        addToStartOfDateWindow()
      } else if (
        container.scrollLeft + container.offsetWidth >
        container.scrollWidth - 100
      ) {
        addToEndOfDateWindow()
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [addToEndOfDateWindow, addToStartOfDateWindow])

  return (
    <div className="relative size-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="relative h-full">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 absolute left-0 top-1/2 z-10 -translate-y-1/2 backdrop-blur-sm"
            onClick={handleLeftClick}
            disabled={isLoading}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 absolute right-0 top-1/2 z-10 -translate-y-1/2 backdrop-blur-sm"
            onClick={handleRightClick}
            disabled={isLoading}
          >
            <ChevronRight className="size-4" />
          </Button>

          <div
            ref={containerRef}
            className="flex h-full snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-12 scrollbar-hide"
            style={{
              scrollPaddingLeft: SCROLL_PADDING,
              scrollPaddingRight: SCROLL_PADDING
            }}
          >
            {columns.map(column => (
              <div key={column.date} className="flex gap-6">
                <div
                  id={column.date}
                  className="w-[300px] shrink-0 snap-center"
                >
                  <div className="mb-4 space-y-1.5">
                    <h2 className="text-lg font-semibold">
                      {format(new Date(column.date), "EEEE")}
                      <span className="text-muted-foreground text-sm ml-2">
                        {format(new Date(column.date), "MMM d")}
                      </span>
                    </h2>
                  </div>

                  <AnimatePresence mode="wait">
                    {currentView === "board" && showCalendar !== column.date ? (
                      <motion.div
                        key="board"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SortableContext
                          items={column.tasks.map(t => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <TaskColumn
                            id={column.date}
                            isDragging={isDragging}
                            isOverCalendarZone={isOverCalendarZone === column.date}
                            showCalendarZone={
                              dragStartDate === column.date &&
                              (!activeId ||
                                findTaskById(activeId)?.date === column.date)
                            }
                          >
                            {column.tasks.map(task => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                day={column}
                                isOverCalendarZone={
                                  isOverCalendarZone === column.date &&
                                  activeTask?.id === task.id
                                }
                                onDelete={async taskId => {
                                  await deleteTask(taskId, column.date)
                                }}
                                onTaskUpdate={async updatedTask => {
                                  try {
                                    setLocalDailyTasks(prev => {
                                      const updated = structuredClone(prev)
                                      if (!updated[column.date]) {
                                        updated[column.date] = {
                                          tasks: [],
                                          date: column.date,
                                          id: "",
                                          createdAt: "",
                                          updatedAt: ""
                                        }
                                      }
                                      updated[column.date].tasks =
                                        updated[column.date].tasks.map(t =>
                                          t.id === updatedTask.id
                                            ? updatedTask
                                            : t
                                        )
                                      return updated
                                    })
                                    await updateTaskAction(
                                      column.date,
                                      updatedTask.id,
                                      {
                                        ...updatedTask
                                      }
                                    )
                                  } catch (error) {
                                    console.error("Failed to update task:", error)
                                  }
                                }}
                              />
                            ))}
                          </TaskColumn>
                        </SortableContext>

                        <Button
                          variant="outline"
                          className="mt-4 w-full justify-start"
                          onClick={() => addTask(column.date)}
                        >
                          <Plus className="mr-2 size-4" />
                          Add task
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="calendar"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CalendarColumn
                          id={`calendar-${column.date}`}
                          date={column.date}
                          tasks={column.tasks}
                          onDeleteTask={async taskId => {
                            await deleteTask(taskId, column.date)
                          }}
                          onAddTask={async task => {
                            setLocalDailyTasks(prev => {
                              const updated = structuredClone(prev)
                              updated[column.date].tasks.push(task)
                              return updated
                            })
                            await addTaskAction(column.date, task)
                          }}
                          onScheduleTask={async hour => {
                            if (activeTask) {
                              const updatedTask = {
                                ...activeTask,
                                startTime: createStartTimeISO(column.date, hour)
                              }
                              try {
                                await updateTaskAction(
                                  column.date,
                                  activeTask.id,
                                  updatedTask
                                )
                                setLocalDailyTasks(prev => {
                                  const updated = structuredClone(prev)
                                  if (!updated[column.date]) {
                                    updated[column.date] = {
                                      tasks: [],
                                      date: column.date,
                                      id: "",
                                      createdAt: "",
                                      updatedAt: ""
                                    }
                                  }
                                  updated[column.date].tasks =
                                    updated[column.date].tasks.map(t =>
                                      t.id === activeTask.id
                                        ? updatedTask
                                        : t
                                    )
                                  return updated
                                })
                              } catch (error) {
                                console.error("Failed to update task time:", error)
                              }
                            }
                          }}
                          onEventUpdate={async (eventId, updates) => {
                            // Example: persist to your Google Calendar or context
                            console.log(
                              "onEventUpdate invoked for Google Calendar event:",
                              eventId,
                              updates
                            )
                            // TODO: Integrate with your Google Calendar API or context
                          }}
                          onResizeTask={async (taskId, durationMinutes) => {
                            const task = column.tasks.find(t => t.id === taskId)
                            if (!task) return

                            const updatedTask = {
                              ...task,
                              durationMinutes
                            }

                            try {
                              setLocalDailyTasks(prev => {
                                const updated = structuredClone(prev)
                                if (!updated[column.date]) {
                                  updated[column.date] = {
                                    tasks: [],
                                    date: column.date,
                                    id: "",
                                    createdAt: "",
                                    updatedAt: ""
                                  }
                                }
                                updated[column.date].tasks =
                                  updated[column.date].tasks.map(t =>
                                    t.id === taskId ? updatedTask : t
                                  )
                                return updated
                              })
                              await updateTaskAction(
                                column.date,
                                taskId,
                                updatedTask
                              )
                            } catch (error) {
                              console.error(
                                "Failed to update task duration:",
                                error
                              )
                            }
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeId && activeTask && dragStartDate ? (
            <TaskCard
              task={activeTask}
              day={columns.find(col => col.date === dragStartDate)}
              isOverCalendarZone={isOverCalendarZone === dragStartDate}
            />
          ) : null}
        </DragOverlay>

        {newTaskDate && (
          <EditTaskDialog
            day={{
              tasks: localDailyTasks[newTaskDate]?.tasks || [],
              date: newTaskDate,
              id: localDailyTasks[newTaskDate]?.id || "",
              createdAt: localDailyTasks[newTaskDate]?.createdAt || "",
              updatedAt: localDailyTasks[newTaskDate]?.updatedAt || ""
            }}
            isNewTask={true}
            task={{
              id: crypto.randomUUID(),
              title: "New Task",
              description: "",
              durationMinutes: 0,
              subtasks: [],
              completed: false,
              tags: ["work"],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }}
            open={isNewTaskDialogOpen}
            onOpenChange={setIsNewTaskDialogOpen}
            onSave={async newTask => {
              try {
                const updatedDay = {
                  tasks: [
                    ...(localDailyTasks[newTaskDate]?.tasks || []),
                    newTask
                  ],
                  date: newTaskDate,
                  id: localDailyTasks[newTaskDate]?.id || "",
                  createdAt: localDailyTasks[newTaskDate]?.createdAt || "",
                  updatedAt: localDailyTasks[newTaskDate]?.updatedAt || ""
                }
                setLocalDailyTasks(prev => ({
                  ...prev,
                  [newTaskDate]: updatedDay
                }))
                await addTaskAction(newTaskDate, newTask)
              } catch (error) {
                console.error("Failed to add new task:", error)
              }
            }}
          />
        )}
      </DndContext>
    </div>
  )
}