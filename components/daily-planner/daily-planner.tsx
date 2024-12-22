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

import { Button } from "@/components/ui/button"
import { TaskColumn } from "./task-column"
import { TaskCard } from "./task-card"

import { useDate } from "@/lib/context/date-context"
import { useTasks } from "@/lib/context/tasks-context"
import { updateTaskAction, createTaskAction, deleteTaskAction } from "@/actions/db/tasks-actions"
import type { Day, Task } from "@/types/daily-task-types"

const SCROLL_PADDING = 40

export default function DailyPlanner() {
  const {
    selectedDate,
    loadDates,
    addToStartOfDateWindow,
    addToEndOfDateWindow,
    isLoading: isLoadingDates,
    days
  } = useDate()

  const {
    dailyTasks, // Record<string, Day>
    isLoading: isLoadingTasks
  } = useTasks()

  // --------------------------------
  // 1) LOCAL STATE for DRAG & DROP
  // --------------------------------
  const [localDailyTasks, setLocalDailyTasks] = useState<Record<string, Day>>({})
  // The task currently being dragged
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  // The date from which the task was originally dragged
  const [dragStartDate, setDragStartDate] = useState<string | null>(null)
  // The DnDKit "active ID"
  const [activeId, setActiveId] = useState<string | null>(null)
  // A snapshot of localDailyTasks taken at drag start, for revert
  const prevLocalDailyTasksRef = useRef<Record<string, Day> | null>(null)

  // Whenever `dailyTasks` changes, sync local state
  useEffect(() => {
    setLocalDailyTasks(dailyTasks)
  }, [dailyTasks])

  // Build columns from localDailyTasks
  const columns = days.map(dateStr => {
    const doc = localDailyTasks[dateStr] ?? { tasks: [] }
    return {
      date: dateStr,
      tasks: doc.tasks || []
    }
  })

  // Setup DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // --------------------------------
  // UTILS
  // --------------------------------
  function findTaskById(id: string): { date: string; task: Task } | null {
    for (const [date, dailyDoc] of Object.entries(localDailyTasks)) {
      const found = dailyDoc.tasks.find(t => t.id === id)
      if (found) {
        return { date, task: found }
      }
    }
    return null
  }

  // --------------------------------
  // 2) DRAG & DROP EVENT HANDLERS
  // --------------------------------
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)

    // Store a snapshot of localDailyTasks in case we need to revert
    prevLocalDailyTasksRef.current = structuredClone(localDailyTasks)

    // Find the dragged task + date
    const found = findTaskById(event.active.id as string)
    if (!found) return
    const { date: fromDate, task } = found

    // Remove it from local state so the "hover insert" animations have space
    setLocalDailyTasks(prev => {
      const updated = structuredClone(prev) as typeof prev
      updated[fromDate].tasks = updated[fromDate].tasks.filter(
        t => t.id !== task.id
      )
      return updated
    })

    setActiveTask(task)
    setDragStartDate(fromDate)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || !activeTask || !dragStartDate) return

    const activeId = active.id as string
    const overId = over.id as string

    // 1) Identify the column being hovered
    const newCol = columns.find(
      col => col.date === overId || col.tasks.some(t => t.id === overId)
    )
    if (!newCol) return

    // 2) Figure out "overIndex" to place the dragged card
    const overIndex = newCol.tasks.findIndex(t => t.id === overId)
    const indexToInsert = overIndex >= 0 ? overIndex : newCol.tasks.length

    // 3) Update localDailyTasks
    setLocalDailyTasks(prev => {
      const updated = structuredClone(prev) as typeof prev

      // Remove the task from ALL columns (to prevent duplicates)
      Object.keys(updated).forEach(date => {
        updated[date].tasks = updated[date].tasks.filter(t => t.id !== activeId)
      })

      // Insert the task into the new column
      if (!updated[newCol.date]) {
        updated[newCol.date] = {
          tasks: [],
          date: newCol.date,
          id: "",
          createdAt: "",
          updatedAt: ""
        }
      }
      updated[newCol.date].tasks.splice(indexToInsert, 0, activeTask)

      return updated
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    // If user dropped outside valid columns or something is off, revert
    if (!over || !activeTask) {
      if (prevLocalDailyTasksRef.current) {
        setLocalDailyTasks(prevLocalDailyTasksRef.current)
      }
      setActiveTask(null)
      setDragStartDate(null)
      return
    }

    // Identify the column that the user dropped onto
    const overId = over.id as string
    const newCol = columns.find(
      col => col.date === overId || col.tasks.some(t => t.id === overId)
    )
    if (!newCol || !dragStartDate) {
      // Revert
      if (prevLocalDailyTasksRef.current) {
        setLocalDailyTasks(prevLocalDailyTasksRef.current)
      }
      setActiveTask(null)
      setDragStartDate(null)
      return
    }

    // --------------------------------
    // We finalize the local changes
    // (the tasks are already placed by handleDragOver)
    // Then we do background saves for the old date + new date
    // --------------------------------
    const newDate = newCol.date
    const oldDate = dragStartDate
    if (oldDate !== newDate) {
      // The user moved to a different column/date
      void saveDayToFirestore(oldDate, localDailyTasks[oldDate])
      void saveDayToFirestore(newDate, localDailyTasks[newDate])
    } else {
      // The user reordered tasks within the same date
      void saveDayToFirestore(newDate, localDailyTasks[newDate])
    }

    // Clear out
    setActiveTask(null)
    setDragStartDate(null)
  }

  // --------------------------------
  // 3) ADD TASK
  // --------------------------------
  async function addTask(dateStr: string) {
    setLocalDailyTasks(prev => {
      const updated = structuredClone(prev) as typeof prev
      if (!updated[dateStr]) {
        updated[dateStr] = {
          tasks: [],
          date: dateStr,
          id: "",
          createdAt: "",
          updatedAt: ""
        }
      }
      updated[dateStr].tasks.push({
        id: crypto.randomUUID(),
        title: "New Task",
        time: "0:00",
        subtasks: [],
        completed: false,
        tag: "work",
        order: updated[dateStr].tasks.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return updated
    })

    // Then save that day in the background
    await saveDayToFirestore(dateStr, localDailyTasks[dateStr])
  }

  // --------------------------------
  // DRAG OVERLAY
  // --------------------------------
  const dragOverlayContent = activeTask ? <TaskCard task={activeTask} /> : null

  // --------------------------------
  // SCROLL TO A DATE
  // --------------------------------
  const containerRef = useRef<HTMLDivElement>(null)

  function scrollToDate(dateStr: string) {
    const targetColumn = columns.find(col => col.date === dateStr)
    if (!targetColumn || !containerRef.current) {
      loadDates(new Date(dateStr))
      return
    }
    const columnElement = document.getElementById(dateStr)
    if (!columnElement) return

    const container = containerRef.current
    const scrollLeft =
      columnElement.offsetLeft -
      container.offsetWidth / 2 +
      columnElement.offsetWidth / 2

    container.scrollTo({ left: scrollLeft, behavior: "smooth" })
  }

  // Whenever selectedDate changes, scroll to that date’s column
  useEffect(() => {
    if (selectedDate) {
      scrollToDate(format(selectedDate, "yyyy-MM-dd"))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, columns])

  // --------------------------------
  // LOADING STATE
  // --------------------------------
  const isLoading = isLoadingDates || isLoadingTasks

  async function saveDayToFirestore(dateStr: string, dayData: Day) {
    try {
      const prevDay = prevLocalDailyTasksRef.current?.[dateStr]
      const prevTasks = new Set(prevDay?.tasks.map(t => t.id) || [])
      const currentTasks = new Set(dayData.tasks.map(t => t.id))

      const tasksToAdd = dayData.tasks.filter(t => !prevTasks.has(t.id))
      const tasksToUpdate = dayData.tasks.filter(t => prevTasks.has(t.id))
      const tasksToDelete = prevDay?.tasks.filter(t => !currentTasks.has(t.id)) || []

      for (const task of tasksToAdd) {
        const { id, createdAt, updatedAt, ...taskData } = task
        await createTaskAction(dateStr, taskData)
      }

      for (const task of tasksToUpdate) {
        const { id, createdAt, updatedAt, ...updates } = task
        await updateTaskAction(dateStr, id, updates)
      }

      for (const task of tasksToDelete) {
        await deleteTaskAction(dateStr, task.id)
      }

      console.log("Successfully saved day to Firestore:", dateStr)
    } catch (error) {
      console.error("Error saving day to Firestore:", error)
    }
  }

  // --------------------------------
  // RENDER
  // --------------------------------
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
            onClick={() => addToStartOfDateWindow()}
            disabled={isLoading}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 absolute right-0 top-1/2 z-10 -translate-y-1/2 backdrop-blur-sm"
            onClick={() => addToEndOfDateWindow()}
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
              <div
                key={column.date}
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

                <SortableContext
                  items={column.tasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <TaskColumn id={column.date}>
                    {column.tasks.map(task => (
                      <TaskCard key={task.id} task={task} />
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
              </div>
            ))}
          </div>
        </div>

        <DragOverlay>{dragOverlayContent}</DragOverlay>
      </DndContext>
    </div>
  )
}
