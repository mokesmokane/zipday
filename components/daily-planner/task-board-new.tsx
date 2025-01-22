"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { format, subDays, subMonths, subYears } from "date-fns"
import { Plus } from "lucide-react"

import { TaskColumn } from "./task-column"
import { TaskCard } from "./task-card"
import { CalendarColumn } from "./calendar-column"
import { Button } from "@/components/ui/button"
import { EditTaskDialog } from "./edit-task-dialog"
import type { Task, Day } from "@/types/daily-task-types"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useTasks } from "@/lib/context/tasks-context"
import { useBacklog } from "@/lib/context/backlog-context"
import { useTaskActions } from "@/lib/context/task-actions-context"

/**
 * We have the following columns in the board:
 * - backlog
 * - incomplete
 * - today
 * - future
 * We also have a separate "Calendar" column for the selectedDate, though it's rendered differently.
 */

type ColumnId = "backlog" | "incomplete" | "today" | "future"

// Allowed drag drops from -> to
const ALLOWED_DROPS: Record<ColumnId, ColumnId[]> = {
  backlog: ["today", "incomplete", "future"],
  incomplete: ["backlog", "today", "future"],
  today: ["backlog", "incomplete", "future"],
  future: ["backlog", "incomplete", "today"]
}

interface TaskBoardProps {
  today: Day
  selectedDate: Date
  setSelectedDate: (date: Date) => void
}

/**
 * The TaskBoard is responsible for showing multiple columns:
 * - Backlog
 * - Incomplete (with a range filter)
 * - Today
 * - Future
 * - Calendar (for the selectedDate)
 *
 * The local state approach is used here to ensure that tasks reorder in real time as we drag.
 * We finalize changes (Firestore/backlog update) in handleDragEnd.
 */
export function TaskBoard({ today, selectedDate, setSelectedDate }: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [dragStartColumn, setDragStartColumn] = useState<ColumnId | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [incompleteTimeRange, setIncompleteTimeRange] = useState<"week" | "month" | "year" | "all">("week")
  const [previewColumnId, setPreviewColumnId] = useState<ColumnId | null>(null)

  const { incompleteTasks, futureTasks, dailyTasks } = useTasks()
  const { backlogTasks, reorderTasks: reorderBacklogTasks, updateBacklogPreview, clearPreviews } = useBacklog()
  const {
    addTask,
    deleteTask,
    updateTask,
    addBacklogTask,
    deleteBacklogTask,
    updateBacklogTask,
    refreshTasks,
    refreshBacklog
  } = useTaskActions()

  // Get tasks for "today" column
  const todayTasks = dailyTasks[today.date]?.tasks || []

  // Memoize filtered tasks to prevent recalculation on every render
  const filteredIncompleteTasks = useMemo(() => {
    return incompleteTasks.filter(task => {
      const taskDate = new Date(task.createdAt)
      const now = new Date()
      switch (incompleteTimeRange) {
        case "week":
          return taskDate >= subDays(now, 7)
        case "month":
          return taskDate >= subMonths(now, 1)
        case "year":
          return taskDate >= subYears(now, 1)
        case "all":
          return true
        default:
          return true
      }
    })
  }, [incompleteTasks, incompleteTimeRange])

  // Define columns structure
  const columns = {
    backlog: backlogTasks,
    incomplete: filteredIncompleteTasks,
    today: todayTasks,
    future: futureTasks
  }

  // For revert in case of errors
  const prevColumnsRef = useRef(columns)

  // DnD kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  /**
   * Helper to find which column a task is in
   */
  function findTaskById(id: string): { columnId: ColumnId; task: Task } | null {
    for (const col of ["backlog", "incomplete", "today", "future"] as ColumnId[]) {
      const found = columns[col].find(t => t.id === id)
      if (found) {
        return { columnId: col, task: found }
      }
    }
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    setIsDragging(true)
    const found = findTaskById(active.id.toString())
    if (found) {
      setActiveTask(found.task)
      setDragStartColumn(found.columnId)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || !activeTask || !dragStartColumn) return

    const overId = over.id.toString()
    if (overId === activeTask.id) return

    const newCol = getColumnIdFromOverId(overId)
    if (!newCol) return

    if (!ALLOWED_DROPS[dragStartColumn]?.includes(newCol) && dragStartColumn !== newCol) {
      setPreviewColumnId(null)
      return
    }

    setPreviewColumnId(newCol)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setIsDragging(false)
    setPreviewColumnId(null)
    const startCol = dragStartColumn
    
    // If no drop target or no activeTask, revert
    if (!over || !activeTask || !startCol) {
      setActiveTask(null)
      return
    }

    const overId = over.id.toString()
    const endCol = getColumnIdFromOverId(overId) || startCol

    // If same column with reordering, or if not allowed, we still finalize
    // The local state is already updated
    // We'll commit to backend if the column actually changed
    const changedColumns = startCol !== endCol

    // If it's not an allowed drop AND it's not the same column, revert changes
    if (
      !ALLOWED_DROPS[startCol]?.includes(endCol) &&
      startCol !== endCol
    ) {
      // revert local changes
      setActiveTask(null)
      return
    }

    // We can now persist changes to the backend
    try {
      if (startCol === endCol) {
        // If it's the same column, handle reordering for backlog only, or do nothing
        // For backlog reordering
        if (startCol === "backlog") {
          // reorder backlog
          const newOrder = columns.backlog.map(t => t.id)
          await reorderBacklogTasks(newOrder)
          await refreshBacklog()
        }
      } else {
        // We are moving from one column to another
        if (startCol === "backlog" && endCol === "today") {
          // from backlog to today
          const dateStr = format(new Date(), "yyyy-MM-dd")
          await deleteBacklogTask(activeTask.id)
          await addTask(dateStr, { ...activeTask, calendarItem: undefined })
          await refreshBacklog()
          await refreshTasks()
        } else if (startCol === "backlog" && endCol === "incomplete") {
          // from backlog to incomplete is basically "past incomplete"? Implementation may vary
          // In this simplified logic, we treat it like "today" or another day.
          // We'll treat incomplete like some arbitrary day in the past. This is an example:
          // If we want to do something special, we'd do it here. For now let's do nothing or revert:
          // We'll revert local changes, or for demonstration we add a no-op
          setActiveTask(null)
        } else if (startCol === "backlog" && endCol === "future") {
          // from backlog to future (some day after 'today')
          // For now let's pick tomorrow or rely on user to do it in UI.
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          const dateStr = format(tomorrow, "yyyy-MM-dd")
          await deleteBacklogTask(activeTask.id)
          await addTask(dateStr, { ...activeTask, calendarItem: undefined })
          await refreshBacklog()
          await refreshTasks()
        } else if (startCol === "incomplete" && endCol === "backlog") {
          // from incomplete to backlog
          // We must figure out which date the incomplete task belongs to
          const sourceDay = findTaskDayInContext(activeTask.id)
          if (sourceDay) {
            await deleteTask(sourceDay, activeTask.id)
          }
          await addBacklogTask({ ...activeTask })
          await refreshBacklog()
          await refreshTasks()
        } else if (startCol === "incomplete" && endCol === "today") {
          // from incomplete to today
          const dateStr = format(new Date(), "yyyy-MM-dd")
          const sourceDay = findTaskDayInContext(activeTask.id)
          if (sourceDay) {
            await deleteTask(sourceDay, activeTask.id)
          }
          await addTask(dateStr, { ...activeTask, calendarItem: undefined })
          await refreshTasks()
        } else if (startCol === "incomplete" && endCol === "future") {
          // from incomplete to future
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          const dateStr = format(tomorrow, "yyyy-MM-dd")
          const sourceDay = findTaskDayInContext(activeTask.id)
          if (sourceDay) {
            await deleteTask(sourceDay, activeTask.id)
          }
          await addTask(dateStr, { ...activeTask, calendarItem: undefined })
          await refreshTasks()
        } else if (startCol === "today" && endCol === "backlog") {
          // from today to backlog
          const dateStr = format(new Date(), "yyyy-MM-dd")
          await deleteTask(dateStr, activeTask.id)
          await addBacklogTask({ ...activeTask })
          await refreshBacklog()
          await refreshTasks()
        } else if (startCol === "today" && endCol === "incomplete") {
          // from today to incomplete
          const dateStr = format(new Date(), "yyyy-MM-dd")
          await deleteTask(dateStr, activeTask.id)
          // Now we assume incomplete is "past"? We'll skip an actual day write
          // or we can keep it in local incomplete array only. For a real app you'd handle specifics.
          await refreshTasks()
        } else if (startCol === "today" && endCol === "future") {
          // from today to future
          const dateStr = format(new Date(), "yyyy-MM-dd")
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          const futureDateStr = format(tomorrow, "yyyy-MM-dd")
          await deleteTask(dateStr, activeTask.id)
          await addTask(futureDateStr, { ...activeTask })
          await refreshTasks()
        } else if (startCol === "future" && endCol === "backlog") {
          // from future to backlog
          const sourceDay = findTaskDayInContext(activeTask.id)
          if (sourceDay) {
            await deleteTask(sourceDay, activeTask.id)
          }
          await addBacklogTask({ ...activeTask })
          await refreshBacklog()
          await refreshTasks()
        } else if (startCol === "future" && endCol === "incomplete") {
          // from future to incomplete
          const sourceDay = findTaskDayInContext(activeTask.id)
          if (sourceDay) {
            await deleteTask(sourceDay, activeTask.id)
          }
          // For demonstration, do nothing else or pick a random day in the past
          await refreshTasks()
        } else if (startCol === "future" && endCol === "today") {
          // from future to today
          const sourceDay = findTaskDayInContext(activeTask.id)
          const dateStr = format(new Date(), "yyyy-MM-dd")
          if (sourceDay) {
            await deleteTask(sourceDay, activeTask.id)
          }
          await addTask(dateStr, { ...activeTask })
          await refreshTasks()
        }
      }
    } catch (error) {
      console.error("Error committing changes in drag end:", error)
      // revert local
      setActiveTask(null)
    }
  }

  /**
   * Find which date the given task is on in dailyTasks context
   */
  function findTaskDayInContext(taskId: string): string | null {
    const entries = Object.entries(dailyTasks)
    for (const [dayDate, dayObj] of entries) {
      if (dayObj.tasks.some(t => t.id === taskId)) {
        return dayDate
      }
    }
    return null
  }

  /**
   * Given an ID from the "over" event, figure out which column it belongs to.
   * If it matches a column ID, we return that. If it matches a task ID within some column, return that column.
   */
  function getColumnIdFromOverId(overId: string): ColumnId | null {
    const colIds: ColumnId[] = ["backlog", "incomplete", "today", "future"]
    if (colIds.includes(overId as ColumnId)) {
      return overId as ColumnId
    }
    // or find if it's a task ID
    const found = findTaskById(overId)
    if (found) {
      return found.columnId
    }
    return null
  }

  // Columns definition from columns
  const columnsDefinition = [
    {
      id: "backlog",
      title: (
        <>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">Backlog</h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-lg"
            onClick={() => setIsNewTaskDialogOpen(true)}
          >
            <Plus className="size-4" />
          </Button>
        </>
      ),
      tasks: columns.backlog,
      onAddTask: async (task: Task) => {
        await addBacklogTask(task)
        await refreshBacklog()
      }
    },
    {
      id: "incomplete",
      title: (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Incomplete</h2>
          </div>
          <div className="flex gap-1 text-xs">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-6 px-2 text-xs",
                incompleteTimeRange === "week" && "bg-primary text-primary-foreground"
              )}
              onClick={() => setIncompleteTimeRange("week")}
            >
              Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-6 px-2 text-xs",
                incompleteTimeRange === "month" && "bg-primary text-primary-foreground"
              )}
              onClick={() => setIncompleteTimeRange("month")}
            >
              Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-6 px-2 text-xs",
                incompleteTimeRange === "year" && "bg-primary text-primary-foreground"
              )}
              onClick={() => setIncompleteTimeRange("year")}
            >
              Year
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-6 px-2 text-xs",
                incompleteTimeRange === "all" && "bg-primary text-primary-foreground"
              )}
              onClick={() => setIncompleteTimeRange("all")}
            >
              All
            </Button>
          </div>
        </>
      ),
      tasks: columns.incomplete
    },
    {
      id: "today",
      title: (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Today</h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-lg"
            onClick={() => setIsNewTaskDialogOpen(true)}
          >
            <Plus className="size-4" />
          </Button>
        </>
      ),
      tasks: columns.today,
      onAddTask: async (task: Task) => {
        const date = format(new Date(), "yyyy-MM-dd")
        await addTask(date, task)
        await refreshTasks()
      }
    },
    {
      id: "future",
      title: (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Future</h2>
        </div>
      ),
      tasks: columns.future
    }
  ]

  return (
    <div className="relative size-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 h-full px-6">
          {columnsDefinition.map(column => (
            <div key={column.id} className="w-[300px]">
              <div className="mb-4 flex justify-between items-center">{column.title}</div>
              <SortableContext
                id={`${column.id}`}
                items={column.tasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <TaskColumn
                  id={column.id}
                  isDragging={isDragging}
                  isOverCalendarZone={false}
                  showCalendarZone={false}
                  onAddTask={column.onAddTask}
                >
                  {column.tasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      day={today}
                      isOverCalendarZone={false}
                      onDelete={async taskId => {
                        if (column.id === "backlog") {
                          await deleteBacklogTask(taskId)
                          await refreshBacklog()
                        } else {
                          // For daily tasks or future, we find the relevant day
                          if (column.id === "today") {
                            const date = format(new Date(), "yyyy-MM-dd")
                            await deleteTask(date, taskId)
                            await refreshTasks()
                          } else if (column.id === "incomplete") {
                            const sourceDay = findTaskDayInContext(taskId)
                            if (sourceDay) {
                              await deleteTask(sourceDay, taskId)
                              await refreshTasks()
                            }
                          } else if (column.id === "future") {
                            const sourceDay = findTaskDayInContext(taskId)
                            if (sourceDay) {
                              await deleteTask(sourceDay, taskId)
                              await refreshTasks()
                            }
                          }
                        }
                      }}
                      onTaskUpdate={async updatedTask => {
                        if (column.id === "backlog") {
                          await updateBacklogTask(updatedTask.id, updatedTask)
                          await refreshBacklog()
                        } else {
                          if (column.id === "today") {
                            const date = format(new Date(), "yyyy-MM-dd")
                            await updateTask(date, updatedTask.id, updatedTask)
                            await refreshTasks()
                          } else if (column.id === "incomplete") {
                            const sourceDay = findTaskDayInContext(updatedTask.id)
                            if (sourceDay) {
                              await updateTask(sourceDay, updatedTask.id, updatedTask)
                              await refreshTasks()
                            }
                          } else if (column.id === "future") {
                            const sourceDay = findTaskDayInContext(updatedTask.id)
                            if (sourceDay) {
                              await updateTask(sourceDay, updatedTask.id, updatedTask)
                              await refreshTasks()
                            }
                          }
                        }
                      }}
                    />
                  ))}
                </TaskColumn>
              </SortableContext>
            </div>
          ))}

          {/* Calendar column */}
          <div className="flex-1">
            <div className="mb-4 flex justify-between items-center">
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-semibold hover:cursor-pointer">
                      Calendar
                      <span className="text-muted-foreground text-sm ml-2">
                        {format(selectedDate, "MMM d")}
                      </span>
                    </h2>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={date => {
                      if (date) {
                        setSelectedDate(date)
                        setIsDatePickerOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <CalendarColumn
              id={`calendar-${format(selectedDate, "yyyy-MM-dd")}`}
              date={format(selectedDate, "yyyy-MM-dd")}
              tasks={dailyTasks[format(selectedDate, "yyyy-MM-dd")]?.tasks || []}
              onDeleteTask={async taskId => {
                const date = format(selectedDate, "yyyy-MM-dd")
                await deleteTask(date, taskId)
                await refreshTasks()
              }}
              onTaskUpdate={async task => {
                const date = format(selectedDate, "yyyy-MM-dd")
                await updateTask(date, task.id, task)
                await refreshTasks()
              }}
              onAddTask={async task => {
                const date = format(selectedDate, "yyyy-MM-dd")
                await addTask(date, task)
                await refreshTasks()
              }}
            />
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              day={today}
              isOverCalendarZone={false}
              
            />
          ) : null}
        </DragOverlay>

        <EditTaskDialog
          day={today}
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
          onDelete={async taskId => {
            const date = format(new Date(), "yyyy-MM-dd")
            await deleteTask(date, taskId)
            await refreshTasks()
          }}
          onSave={async task => {
            if (task.id) {
              const date = format(new Date(), "yyyy-MM-dd")
              await addTask(date, task)
              await refreshTasks()
            }
            setIsNewTaskDialogOpen(false)
          }}
        />
      </DndContext>
    </div>
  )
}