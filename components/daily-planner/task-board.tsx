"use client"

import { useEffect, useState } from "react"
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { format, isToday, subDays, subMonths, subYears } from "date-fns"
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
import { addTaskAction, deleteTaskAction, updateTaskAction } from "@/actions/db/tasks-actions"
// Add this type definition at the top of the file
type ColumnId = 'backlog' | 'incomplete' | 'today' | 'future' | 'calendar'

// Add this constant to define allowed drag destinations for each column
const ALLOWED_DROPS: Record<ColumnId, ColumnId[]> = {
  'backlog': ['today', 'calendar', 'backlog'],  // Can only drag FROM backlog TO today or calendar
  'incomplete': [], // Cannot drag TO incomplete
  'today': ['backlog', 'calendar', 'today'],
  'future': ['backlog', 'calendar', 'today'],
  'calendar': [] // Calendar items can go to backlog, today, or other calendar dates
}

interface TaskBoardProps {
  today: Day
  selectedDate: Date
  setSelectedDate: (date: Date) => void
}

export function TaskBoard({ today, selectedDate, setSelectedDate }: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [localColumnTasks, setLocalColumnTasks] = useState<Record<string, Task[]>>({})
  const [incompleteTimeRange, setIncompleteTimeRange] = useState<"week" | "month" | "year" | "all">("week")
  const [previewColumnId, setPreviewColumnId] = useState<string | null>(null)
  const [sourceColumnId, setSourceColumnId] = useState<ColumnId | null>(null)
  const { incompleteTasks, futureTasks, dailyTasks } = useTasks()
  const { backlogTasks, reorderTasks: reorderBacklogTasks, clearPreviews, deleteTask: deleteBacklogTask, updateTask: updateBacklogTask, addTask: addBacklogTask, refreshBacklog } = useBacklog()
  
  const { 
    addTask, 
    deleteTask, 
    updateTask, 
    reorderDayTasks,
    refreshTasks,
  } = useTasks()

  // Sync local state with global tasks
  useEffect(() => {
    console.log("Syncing local state with global tasks")
    setLocalColumnTasks({
      backlog: backlogTasks,
      today: dailyTasks[today.date]?.tasks || [],
      incomplete: incompleteTasks,
      future: futureTasks
    })
  }, [backlogTasks, dailyTasks, incompleteTasks, futureTasks])
  
  // Filter incomplete tasks based on time range
  const filteredIncompleteTasks = incompleteTasks.filter(task => {
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const todayTasks = dailyTasks[today.date]?.tasks || []

  const columns = [
    { 
      id: "backlog", 
      title: (
        <>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">
              Backlog
            </h2>
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
      tasks: localColumnTasks.backlog || [],
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
      tasks: filteredIncompleteTasks 
    },
    { 
      id: "today", 
      title: (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              Today
            </h2>
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
      tasks: localColumnTasks.today || [],
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
          <h2 className="text-lg font-semibold">
            Future
          </h2>
        </div>
      ), 
      tasks: futureTasks
    },
  ]

  function handleDragStart(event: DragStartEvent) {
    console.log("Drag start event data:", {
      active: event.active.id
    })
    const { active } = event
    const columnId = active.data.current?.sortable?.containerId?.split('-')[0] as ColumnId
    setSourceColumnId(columnId)
    // Check all columns for the task
    const task = 
      backlogTasks.find(t => t.id === active.id) ||
      incompleteTasks.find(t => t.id === active.id) ||
      todayTasks.find(t => t.id === active.id) ||
      futureTasks.find(t => t.id === active.id)

    if (task) {
      setActiveTask(task)
      setIsDragging(true)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    
    const { active, over } = event
    if (!over || !activeTask) return

    console.log("Active task:", activeTask)
    console.log("Over:", over)

    const activeId = active.id as string
    const overId = over.id as string


    // Check if over a calendar hour
    // const isOverCalendarHour = overId.match(/calendar-(.+)-hour-(\d+)/)
    // const isOverCalendarColumn = overId.startsWith("calendar-")

    // if (isOverCalendarHour || isOverCalendarColumn) {
    //   const targetDate = isOverCalendarHour
    //     ? getDateFromCalendarId(overId)
    //     : getDateFromCalendarId(overId)
    //   setIsOverCalendarZone(targetDate)
    // } else {
    //   setIsOverCalendarZone(null)
    // }

    // Preview dropping into a calendar hour
    // if (isOverCalendarHour) {
    //   const [, fullDate, hourStr] = isOverCalendarHour
    //   const hour = parseInt(hourStr, 10)

    //   // Update the task startTime for preview
    //   const updatedTask:Task = {
    //     ...activeTask,
    //     calendarItem: {
    //       start: {
    //         date: fullDate,
    //         dateTime: createStartTimeISO(fullDate, hour)
    //       }
    //     }
    //   }

    //   setLocalColumnTasks(prev => {
    //     const updated = structuredClone(prev)

    //     // Remove from all dates for preview
    //     Object.keys(updated).forEach(date => {
    //       if (date !== overId) {
    //         updated[date] = updated[date].filter(t => t.id !== activeId)
    //       }
    //     })

    //     // Add to preview date
    //     if (!updated[overId]) {
    //         updated[overId] = []
    //     }

    //     const existingTaskIndex = updated[overId].findIndex(
    //       t => t.id === activeId
    //     )
    //     if (existingTaskIndex !== -1) {
    //       updated[overId][existingTaskIndex] = activeTask
    //     } else {
    //       updated[overId].push(activeTask)
    //     }

    //     return updated
    //   })

    //   setPreviewColumnId(overId)
    //   return
    // }

    // Preview normal column drops
    const newCol = columns.find(
      col => col.id === over.data.current?.sortable?.containerId?.split('-')[0]
    )
    if (!newCol) return

    setLocalColumnTasks(prev => {
      console.log("Updating local column tasks")
      const updated = structuredClone(prev)

      // Remove from all dates for preview
      Object.keys(updated).forEach(date => {
        if (date !== newCol.id) {
          updated[date] = updated[date].filter(t => t.id !== activeId)
        }
      })

      // Add to preview date
      if (!updated[newCol.id]) {
        updated[newCol.id] = []
      }

      const overIndex = newCol.tasks.findIndex(t => t.id === overId)
      const indexToInsert =
        overIndex >= 0 ? overIndex : updated[newCol.id].length

      const existingTaskIndex = updated[newCol.id].findIndex(
        t => t.id === activeId
      )
      if (existingTaskIndex !== -1) {
        updated[newCol.id][existingTaskIndex] = activeTask
      } else {
        updated[newCol.id].splice(indexToInsert, 0, activeTask)
      }

      return updated
    })

    setPreviewColumnId(newCol.id)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setIsDragging(false)
    setActiveTask(null)
    if (!over || !activeTask) return

    const targetColumnId = over.data.current?.sortable?.containerId?.split('-')[0] as ColumnId || over.id.toString().split('-')[0] as ColumnId

    // Handle reordering within the same column
    const tasks = localColumnTasks[targetColumnId] || []
    const overIndex = tasks.findIndex(t => t.id === over.id)
    if (sourceColumnId === targetColumnId) {
      const oldIndex = tasks.findIndex(t => t.id === active.id)
      
      if (oldIndex !== -1 && overIndex !== -1) {
        const newTasks = [...tasks]
        const [movedTask] = newTasks.splice(oldIndex, 1)
        newTasks.splice(overIndex, 0, movedTask)
        
        setLocalColumnTasks(prev => ({
          ...prev,
          [targetColumnId]: newTasks
        }))

        // If in backlog, use backlog reorder function
        // Then in your reordering code:
        if (targetColumnId === 'backlog') {
          await reorderBacklogTasks(newTasks.map(t => t.id))
        } else if (targetColumnId === 'today') {
          await reorderDayTasks(today.date, newTasks.map(t => t.id))
        } 
      }
      return
    }

    // Validate the drop is allowed for cross-column moves
    const isValidDrop = sourceColumnId && ALLOWED_DROPS[sourceColumnId]?.includes(targetColumnId)
    if (!isValidDrop) {
      console.log("Invalid drop target:", { sourceColumnId, targetColumnId })
      return
    }

    try {
      const todayDate = format(new Date(), "yyyy-MM-dd")

      // Moving TO backlog
      if (targetColumnId === 'backlog') {
        console.log("Moving to backlog")
        if (sourceColumnId === 'today') {
          // Remove from today's tasks
          await deleteTask(todayDate, activeTask.id)
          // Add to backlog
          await addBacklogTask({
            ...activeTask,
            calendarItem: undefined
          }, overIndex)
        } else if (sourceColumnId === 'calendar') {
          const sourceDate = active.id.toString().split('-')[1]
          // Remove from calendar date
          await deleteTask(sourceDate, activeTask.id)
          // Add to backlog
          await addBacklogTask({
            ...activeTask,
            calendarItem: undefined
          }, overIndex)
        }
      }
      
      // Moving FROM backlog
      else if (sourceColumnId === 'backlog') {
        if (targetColumnId === 'today') {
          // Remove from backlog
          await deleteBacklogTask(activeTask.id)
          // Add to today
          await addTask(todayDate, {
            ...activeTask,
            calendarItem: undefined
          })
        } else if (targetColumnId === 'calendar') {
          const targetDate = over.id.toString().split('-')[1]
          // Remove from backlog
          await deleteBacklogTask(activeTask.id)
          // Add to calendar date
          await addTask(targetDate, {
            ...activeTask,
            calendarItem: {
              start: { date: targetDate },
              end: { date: targetDate }
            }
          })
        }
      }

      // Moving between calendar dates
      else if (sourceColumnId === 'calendar' && targetColumnId === 'calendar') {
        const sourceDate = active.id.toString().split('-')[1]
        const targetDate = over.id.toString().split('-')[1]
        if (sourceDate !== targetDate) {
          // Remove from source date
          await deleteTask(sourceDate, activeTask.id)
          // Add to target date
          await addTask(targetDate, {
            ...activeTask,
            calendarItem: {
              start: { date: targetDate },
              end: { date: targetDate }
            }
          })
        }
      }

    } catch (error) {
      console.error("Error handling drag end:", error)
    }

    // Clear previews and states
    clearPreviews()
    setPreviewColumnId(null)
    setIsDragging(false)
    setActiveTask(null)
  }

  return (
    <div className="relative size-full">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 h-full px-6">
          {columns.map(column => (
            <div key={column.id} className="w-[300px]">
              <div className="mb-4 flex justify-between items-center">
                {column.title}
                
              </div>
              <SortableContext
                id={`${column.id}-sortable`}
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
                      onDelete={async (taskId) => {
                        if (column.id === 'backlog') {
                          await deleteBacklogTask(taskId)
                          await refreshBacklog()
                        } else {
                          const date = column.id.startsWith('calendar') 
                            ? column.id.split('-')[1] 
                            : format(new Date(), "yyyy-MM-dd")
                          await deleteTask(date, taskId)
                          await refreshTasks()
                        }
                      }}
                      onTaskUpdate={async (updatedTask) => {
                        if (column.id === 'backlog') {
                          await updateBacklogTask(updatedTask.id, updatedTask)
                          await refreshBacklog()
                        } else {
                          const date = column.id.startsWith('calendar')
                            ? column.id.split('-')[1]
                            : format(new Date(), "yyyy-MM-dd")
                          await updateTask(date, updatedTask.id, updatedTask)
                          await refreshTasks()
                        }
                      }}
                    />
                  ))}
                </TaskColumn>
              </SortableContext>
            </div>
          ))}

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
                    onSelect={(date) => {
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
              onDeleteTask={async (taskId) => {
                const date = format(selectedDate, "yyyy-MM-dd")
                await deleteTask(date, taskId)
                await refreshTasks()
              }}
              onTaskUpdate={async (task) => {
                const date = format(selectedDate, "yyyy-MM-dd")
                await updateTask(date, task.id, task)
                await refreshTasks()
              }}
              onAddTask={async (task) => {
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
          onDelete={async (taskId) => {
            const date = format(new Date(), "yyyy-MM-dd")
            await deleteTask(date, taskId)
            await refreshTasks()
          }}
          onSave={async (task) => {
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