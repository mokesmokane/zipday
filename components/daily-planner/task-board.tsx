"use client"

import { useEffect, useState } from "react"
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { format, isToday, subDays, subMonths, subYears } from "date-fns"
import { Plus } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
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

// Add this type definition at the top of the file
type ColumnId = 'backlog' | 'incomplete' | 'today' | 'future' | 'calendar'

// Add this constant to define allowed drag destinations for each column
const ALLOWED_DROPS: Record<ColumnId, ColumnId[]> = {
  'backlog': ['today', 'calendar', 'backlog'],
  'incomplete': ['backlog', 'today', 'calendar'], 
  'today': ['backlog', 'calendar', 'today'],
  'future': ['backlog', 'calendar', 'today'],
  'calendar': ['backlog', 'today', 'calendar']
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
  const [previewColumnId, setPreviewColumnId] = useState<string | null>(null)
  const [sourceColumnId, setSourceColumnId] = useState<ColumnId | null>(null)
  const [calendarColumnPreviewTask, setCalendarColumnPreviewTask] = useState<Task | null>(null)
  const { incompleteTasks, futureTasks, dailyTasks, incompleteTimeRange, setIncompleteTimeRange, futureTimeRange, setFutureTimeRange } = useTasks()
  const { backlogTasks, reorderTasks: reorderBacklogTasks, clearPreviews, deleteTask: deleteBacklogTask, updateTask: updateBacklogTask, addTask: addBacklogTask, refreshBacklog } = useBacklog()
  
  const { 
    addTask, 
    deleteTask, 
    updateTask, 
    reorderDayTasks,
    refreshTasks,
  } = useTasks()

  // Add this state to track when dragging over calendar
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false)

  // Sync local state with global tasks
  useEffect(() => {
    console.log("Syncing local state with global tasks")
    console.log("Backlog tasks:", backlogTasks)
    console.log("Daily tasks:", dailyTasks)
    console.log("Incomplete tasks:", incompleteTasks)
    console.log("Future tasks:", futureTasks)
    
    setLocalColumnTasks({
      backlog: backlogTasks,
      today: dailyTasks[today.date]?.tasks || [],
      incomplete: incompleteTasks,
      future: futureTasks
    })
  }, [backlogTasks, dailyTasks, incompleteTasks, futureTasks])
  
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
      onAddTask: async (task: Task, insertIndex?: number) => {
        await addBacklogTask(task, insertIndex)
      },
      onDeleteTask: async (taskId: string) => {
        await deleteBacklogTask(taskId)
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
      tasks: incompleteTasks,
      onDeleteTask: async (taskId: string) => {
        await deleteTask(taskId)
        await refreshTasks()
      }
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
      onAddTask: async (task: Task, insertIndex?: number) => {  
        await addTask(today.date, task, insertIndex)
        await refreshTasks()
      },
      onDeleteTask: async (taskId: string) => {
        await deleteTask(taskId)
        await refreshTasks()
      }
    },
    { 
      id: "future", 
      title: (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              Future
            </h2>
          </div>
          <div className="flex gap-1 text-xs">
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-6 px-2 text-xs", 
                futureTimeRange === "week" && "bg-primary text-primary-foreground"
              )}
              onClick={() => setFutureTimeRange("week")}
            >
              Week
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-6 px-2 text-xs",
                futureTimeRange === "month" && "bg-primary text-primary-foreground"
              )}
              onClick={() => setFutureTimeRange("month")}
            >
              Month
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-6 px-2 text-xs",
                futureTimeRange === "year" && "bg-primary text-primary-foreground"
              )}
              onClick={() => setFutureTimeRange("year")}
            >
              Year
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-6 px-2 text-xs",
                futureTimeRange === "all" && "bg-primary text-primary-foreground"
              )}
              onClick={() => setFutureTimeRange("all")}
            >
              All
            </Button>
          </div>
        </>
      ), 
      tasks: futureTasks,
      onDeleteTask: async (taskId: string) => {
        await deleteTask(taskId)
        await refreshTasks()
      }
    },
  ]

  function handleDragStart(event: DragStartEvent) {
    console.log("Drag start event data:", event)
    const { active } = event
    const activeId = active.id.toString()
    
    // Check if this is a calendar item by looking for 'calendar' prefix
    const isCalendar = activeId.startsWith('calendar-')
    
    // Get the column ID
    const columnId = isCalendar 
      ? 'calendar' 
      : active.data.current?.sortable?.containerId?.split('-')[0] as ColumnId
    setSourceColumnId(columnId)

    // Extract the task ID - for calendar items, remove the 'calendar-' prefix
    const taskId = isCalendar 
      ? activeId.replace('calendar-', '') 
      : activeId

    // Find the task
    const task = 
      backlogTasks.find(t => t.id === taskId) ||
      incompleteTasks.find(t => t.id === taskId) ||
      todayTasks.find(t => t.id === taskId) ||
      futureTasks.find(t => t.id === taskId)

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
    const isOverCalendarHour = overId.match(/calendar-(.+)-hour-(\d+)/)
    const isOverCalendarColumn = overId.startsWith("calendar-")


    if (isOverCalendarHour || isOverCalendarColumn) {
      setIsDraggingOverCalendar(true)
      const targetDate = isOverCalendarHour
        ? overId.split('-')[1]
        : overId.split('-')[1]
      
      // Update the task startTime for preview
      const updatedTask: Task = {
        ...activeTask,
        calendarItem: {
          start: { date: targetDate },
          end: { date: targetDate }
        }
      }

      if (isOverCalendarHour) {
        const [, , hourStr] = isOverCalendarHour
        const hour = parseInt(hourStr, 10)
        updatedTask.calendarItem = {
          start: {
            date: targetDate,
            dateTime: `${targetDate}T${hour.toString().padStart(2, '0')}:00:00`
          },
          end: {
            date: targetDate,
            dateTime: `${targetDate}T${(hour + 1).toString().padStart(2, '0')}:00:00`
          }
        }
      }

      setCalendarColumnPreviewTask(updatedTask)

      setLocalColumnTasks(prev => {
        const updated = structuredClone(prev)

        // Only remove from preview if not dragging from today column to today's calendar
        const isTodayCalendar = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
        const isDraggingFromToday = sourceColumnId === 'today'

        if (!(isTodayCalendar && isDraggingFromToday)) {
          Object.keys(updated).forEach(date => {
            if (date !== overId) {
              updated[date] = updated[date].filter(t => t.id !== activeId)
            }
          })
        }

        return updated
      })

      setPreviewColumnId(overId)
      return
    } else {
      setIsDraggingOverCalendar(false)
    }

    /// Get target column id either from sortable container or direct column id
    const targetColumnId = over.data.current?.sortable?.containerId?.split('-')[0] 
      || (typeof over.id === 'string' && over.id.split('-')[0])

    // Find the target column
    const newCol = columns.find(col => col.id === targetColumnId)
    
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
    setIsDraggingOverCalendar(false)
    const { active, over } = event
    if (!over || !activeTask) return
    setIsDragging(false)
    setActiveTask(null)

    const targetColumnId = over.data.current?.sortable?.containerId?.split('-')[0] as ColumnId || over.id.toString().split('-')[0] as ColumnId
    const isCalendarTarget = targetColumnId === 'calendar'
    const targetDate = isCalendarTarget ? format(selectedDate, "yyyy-MM-dd") : null
    const isOverCalendarHour = over.id.toString().match(/calendar-(.+)-hour-(\d+)/)

    // Handle calendar drops
    if (isCalendarTarget && targetDate) {
      try {
        console.log("Calendar drop - Source column:", sourceColumnId)
        console.log("Calendar drop - Target date:", targetDate)
        console.log("Calendar drop - Active task:", activeTask)
        
        const isTodayCalendar = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
        const isDraggingFromToday = sourceColumnId === 'today'
        
        // Generate the gcalEventId upfront
        const gcalEventId = activeTask.calendarItem?.gcalEventId?.replace(/-/g, '') || uuidv4().replace(/-/g, '')
        
        let updatedTask: Task = {
          ...activeTask,
          calendarItem: {
            gcalEventId,
            start: { date: targetDate },
            end: { date: targetDate }
          }
        }

        // If dropping on a specific hour, set the time respecting duration
        if (isOverCalendarHour) {
          const hour = parseInt(isOverCalendarHour[2], 10)
          const startDateTime = `${targetDate}T${hour.toString().padStart(2, '0')}:00:00`
          
          // Calculate end time based on task duration if it exists
          const endDateTime = activeTask.durationMinutes 
            ? new Date(new Date(startDateTime).getTime() + activeTask.durationMinutes * 60000).toISOString()
            : `${targetDate}T${(hour + 1).toString().padStart(2, '0')}:00:00`
          
          updatedTask.calendarItem = {
            gcalEventId,
            start: {
              date: targetDate,
              dateTime: startDateTime
            },
            end: {
              date: targetDate,
              dateTime: endDateTime
            }
          }
        }

        // If dragging from backlog
        if (sourceColumnId === 'backlog') {
          console.log("Moving from backlog to calendar")
          await deleteBacklogTask(activeTask.id)
          await addTask(targetDate, updatedTask)
        }
        // If dragging from today to today's calendar, just update the task
        else if (isTodayCalendar && isDraggingFromToday || sourceColumnId === 'calendar') {
          console.log("Updating today's task in calendar")
          await updateTask(activeTask.id, updatedTask)
        }
        // If dragging from incomplete or future
        else if (sourceColumnId === 'incomplete' || sourceColumnId === 'future') {
          console.log("Moving from incomplete/future to calendar")
          // First add to new date, then delete from old
          await addTask(targetDate, updatedTask)
          await deleteTask(activeTask.id)
        }
        // If dragging from any other day column
        else {
          console.log("Moving from other day to calendar")
          await addTask(targetDate, updatedTask)
          await deleteTask(activeTask.id)
        }

        console.log("Refreshing tasks and backlog")
        await refreshTasks()
        await refreshBacklog()
        return
      } catch (error) {
        console.error("Error handling calendar drag end:", error)
        console.error(error)
        return
      }
    }

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
      //get source column delete function
      const sourceColumnDelete = columns.find(col => col.id === sourceColumnId)?.onDeleteTask
      //get target column add function
      const targetColumnAdd = columns.find(col => col.id === targetColumnId)?.onAddTask

      //delete source column task
      sourceColumnDelete && sourceColumnDelete(activeTask.id)
      //add task to target column
      targetColumnAdd && targetColumnAdd(activeTask, overIndex)
    } catch (error) {
      console.error("Error handling drag end:", error)
    }

    // Clear previews and states
    clearPreviews()
    setPreviewColumnId(null)
    setIsDragging(false)
    setActiveTask(null)
  }

  // Add this function
  const mergeTasksWithPreview = (tasks: Task[], previewTask: Task | null): Task[] => {
    if (!previewTask) return tasks;
    const filtered = tasks.filter(t => t.id !== previewTask.id);
    return [...filtered, previewTask];
  }

  return (
    <div className="relative size-full">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 px-6">
          {columns.map(column => (
            <div key={column.id} className="w-[300px] flex flex-col">
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
                          await deleteTask(taskId)
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
                          await updateTask(updatedTask.id, updatedTask)
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
              singleColumn={true}
              tasks={mergeTasksWithPreview(dailyTasks[format(selectedDate, "yyyy-MM-dd")]?.tasks || [], calendarColumnPreviewTask)}
              onDeleteTask={async (taskId) => {
                await deleteTask(taskId)
                await refreshTasks()
              }}
              onTaskUpdate={async (task) => {
                await updateTask(task.id, task)
                await refreshTasks()
              }}
              onAddTask={async (task) => {
                const date = format(selectedDate, "yyyy-MM-dd")
                await addTask(date, task)
                await refreshTasks()
              }}
              onResizeTask={async (taskId, durationMinutes) => {
                console.log("Resizing task:", taskId)
                const task = dailyTasks[format(selectedDate, "yyyy-MM-dd")]?.tasks.find(t => t.id === taskId)
                if (!task) return

                const updatedTask = {
                  ...task,
                  durationMinutes
                }

                // If the task has a calendar time, update the end time based on the new duration
                if (updatedTask.calendarItem?.start?.dateTime) {
                  const startTime = new Date(updatedTask.calendarItem.start.dateTime)
                  const endTime = new Date(startTime.getTime() + durationMinutes * 60000)
                  
                  updatedTask.calendarItem = {
                    ...updatedTask.calendarItem,
                    end: {
                      date: format(endTime, "yyyy-MM-dd"),
                      dateTime: endTime.toISOString()
                    }
                  }
                }

                try {
                  // Update local state first
                  setLocalColumnTasks(prev => {
                    const updated = structuredClone(prev)
                    const date = format(selectedDate, "yyyy-MM-dd")
                    if (!updated[date]) {
                      updated[date] = []
                    }
                    updated[date] = updated[date].map(t => 
                      t.id === taskId ? updatedTask : t
                    )
                    return updated
                  })
                  
                  // Then make the API call
                  await updateTask(taskId, updatedTask)
                  await refreshTasks()
                } catch (error) {
                  console.error(
                    "Failed to update task duration:",
                    error
                  )
                }
              }}
            />
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className={cn(isDraggingOverCalendar && "opacity-50")}>
              <TaskCard
                task={activeTask}
                day={today}
                isOverCalendarZone={false}
              />
            </div>
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
            await deleteTask(taskId)
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