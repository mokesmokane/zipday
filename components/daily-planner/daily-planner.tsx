"use client"

import { useState, useEffect, useRef } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { format } from "date-fns"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TaskColumn } from "./task-column"
import { TaskCard } from "./task-card"
import { useDate } from "@/lib/context/date-context"
import { useTasks } from "@/lib/context/tasks-context"
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction
} from "@/actions/db/tasks-actions"
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

  // -------------------------
  // Context: dailyTasks object
  // e.g. { "2024-12-12": { tasks: [...], meta: {...} }, ... }
  // -------------------------
  const { dailyTasks, isLoading: isLoadingTasks, refreshTasks } = useTasks()

  // ----------------------------------
  // 1) Make a local copy for drag/drop
  // ----------------------------------
  // This local state ensures the UI updates immediately for animations,
  // without waiting on server round trips.
  const [localDailyTasks, setLocalDailyTasks] = useState<
    Record<string, Day>
  >({})

  // Whenever `dailyTasks` from context changes, update local copy
  useEffect(() => {
    setLocalDailyTasks(dailyTasks)
  }, [dailyTasks])

  // Build columns from localDailyTasks
  const columns = days.map(dateStr => {
    // If we have no doc for that date, create an empty one
    const doc = localDailyTasks[dateStr] ?? { tasks: [] }
    return {
      date: dateStr,
      tasks: doc.tasks || []
    }
  })

  // Setup DnDKit
  const [activeId, setActiveId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Utility to find a single task by ID across all days in localDailyTasks
  function findTaskById(id: string): { date: string; task: Task } | null {
    for (const [date, dailyDoc] of Object.entries(localDailyTasks)) {
      const found = dailyDoc.tasks.find(t => t.id === id)
      if (found) {
        return { date, task: found }
      }
    }
    return null
  }

  // -------------------------------
  // 2) DRAG & DROP EVENT HANDLERS
  // -------------------------------
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  /**
   * If user drags from date A -> date B, do local removal & insertion,
   * then server calls in the background.
   */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find old date/column and new date/column
    const oldCol = columns.find(col => col.tasks.some(t => t.id === activeId))
    if (!oldCol) return
    const activeTask = oldCol.tasks.find(t => t.id === activeId)
    if (!activeTask) return

    const newCol = columns.find(
      col => col.date === overId || col.tasks.some(t => t.id === overId)
    )
    if (!newCol) return

    if (oldCol.date !== newCol.date) {
      // 1) Locally remove from old date & add to new date
      setLocalDailyTasks(prev => {
        // Clone
        const updated = structuredClone(prev) as typeof prev
        // Remove from old date
        updated[oldCol.date].tasks = updated[oldCol.date].tasks.filter(
          t => t.id !== activeId
        )
        // Add to new date
        updated[newCol.date].tasks.push({
          ...activeTask
        })
        return updated
      })

      // 2) Fire off server calls
      void deleteTaskAction(oldCol.date, activeId)
        .then(() =>
          createTaskAction(newCol.date, {
            title: activeTask.title,
            time: activeTask.time,
            subtasks: activeTask.subtasks,
            completed: activeTask.completed,
            tag: activeTask.tag,
            order: newCol.tasks.length
          })
        )
        .then(() => refreshTasks())
        .catch(err => {
          console.error("DragOver error:", err)
          // Optionally revert or refresh:
          void refreshTasks()
        })
    }
  }

  /**
   * If reordering tasks within the same day, reorder them locally,
   * then do background updates on the server.
   */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) {
      setActiveId(null)
      return
    }
    const activeId = active.id as string
    const overId = over.id as string

    // find date col for the active task
    const dateCol = columns.find(col => col.tasks.some(t => t.id === activeId))
    if (!dateCol) {
      setActiveId(null)
      return
    }

    const tasksArray = dateCol.tasks
    const oldIndex = tasksArray.findIndex(t => t.id === activeId)
    const newIndex = tasksArray.findIndex(t => t.id === overId)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      setActiveId(null)
      return
    }

    // 1) Locally reorder
    setLocalDailyTasks(prev => {
      const updated = structuredClone(prev) as typeof prev
      const colTasks = updated[dateCol.date].tasks
      const [moved] = colTasks.splice(oldIndex, 1)
      colTasks.splice(newIndex, 0, moved)
      return updated
    })

    // 2) Server reorder calls
    // (same naive approach you had previously)
    const activeTask = tasksArray[oldIndex]
    const start = Math.min(oldIndex, newIndex)
    const end = Math.max(oldIndex, newIndex)
    const movingUp = oldIndex > newIndex
    const rangeTasks = tasksArray.slice(start, end + 1).sort((a, b) => a.order - b.order)

    Promise.all(
      rangeTasks.map(async t => {
        if (t.id === activeId) return
        const newOrder = movingUp ? t.order + 1 : t.order - 1
        return updateTaskAction(dateCol.date, t.id, { order: newOrder })
      })
    )
      .then(() => {
        if (activeTask) {
          const newOrder = movingUp
            ? rangeTasks[0].order
            : rangeTasks[rangeTasks.length - 1].order
          return updateTaskAction(dateCol.date, activeTask.id, { order: newOrder })
        }
      })
      .then(() => refreshTasks())
      .catch(err => {
        console.error("DragEnd reorder error:", err)
        void refreshTasks()
      })

    setActiveId(null)
  }

  // ------------------------
  // 3) ADD TASK HELPER
  // ------------------------
  async function addTask(dateStr: string) {
    // 1) Insert locally first
    setLocalDailyTasks(prev => {
      const updated = structuredClone(prev) as typeof prev
      if (!updated[dateStr]) {
        updated[dateStr] = { tasks: [], date: dateStr, id: "", createdAt: "", updatedAt: "" }
      }
      updated[dateStr].tasks.push({
        // Make a temp ID or get it from Firestore if you prefer
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

    // 2) Server call
    await createTaskAction(dateStr, {
      title: "New Task",
      time: "0:00",
      subtasks: [],
      completed: false,
      tag: "work",
      order: dailyTasks[dateStr]?.tasks?.length ?? 0
    })
    await refreshTasks()
  }

  // ---------------------------------------------
  // 4) DRAG OVERLAY: find the active task to show
  // ---------------------------------------------
  const activeTaskData = activeId ? findTaskById(activeId) : null
  const activeTask = activeTaskData?.task

  // 5) Scroll to date
  function scrollToDate(date: string) {
    const targetColumn = columns.find(col => col.date === date)
    if (!targetColumn || !containerRef.current) {
      loadDates(new Date(date)) // attempt to load that date
      return
    }
    const columnElement = document.getElementById(date)
    if (!columnElement) return

    const container = containerRef.current
    const scrollLeft =
      columnElement.offsetLeft - container.offsetWidth / 2 + columnElement.offsetWidth / 2

    container.scrollTo({ left: scrollLeft, behavior: "smooth" })
  }

  // Whenever selectedDate changes, we scroll to that date’s column
  useEffect(() => {
    if (selectedDate) {
      scrollToDate(format(selectedDate, "yyyy-MM-dd"))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, columns])

  const isLoading = isLoadingDates || isLoadingTasks

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

        <DragOverlay>
          {activeId && activeTask ? (
            <TaskCard task={activeTask} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
