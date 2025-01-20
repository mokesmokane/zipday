"use client"

import { useState } from "react"
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
// Add this type definition at the top of the file
type ColumnId = 'backlog' | 'incomplete' | 'today' | 'future' | 'calendar'

// Add this constant to define allowed drag destinations for each column
const ALLOWED_DROPS: Record<ColumnId, ColumnId[]> = {
  'backlog': ['today', 'calendar'],  // Can only drag FROM backlog TO today or calendar
  'incomplete': [], // Cannot drag TO incomplete
  'today': ['backlog', 'calendar'],
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
  const [incompleteTimeRange, setIncompleteTimeRange] = useState<"week" | "month" | "year" | "all">("week")
  const [previewColumnId, setPreviewColumnId] = useState<string | null>(null)
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
      tasks: backlogTasks,
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
      tasks: todayTasks,
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

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || !activeTask) return

    // Get column IDs
    const activeColumnId = active.data.current?.sortable?.containerId?.split('-')[0]
    const overColumnId = over.data.current?.sortable?.containerId?.split('-')[0] || over.id

    // Don't show preview if we're still in the source column
    if (activeColumnId === overColumnId) {
      setPreviewColumnId(null)
      return
    }

    // Check if this is a valid drop target
    const sourceColumn = activeColumnId as ColumnId
    const targetColumn = overColumnId as ColumnId

    // Only show preview if it's a valid drop target and not the source column
    if (ALLOWED_DROPS[sourceColumn]?.includes(targetColumn)) {
      setPreviewColumnId(overColumnId.toString())
      
      // Create a preview task
      const previewTask = {
        ...activeTask,
        id: `preview-${activeTask.id}`,
        calendarItem: overColumnId.startsWith('calendar') 
          ? {
              start: { date: overColumnId.split('-')[1] },
              end: { date: overColumnId.split('-')[1] }
            }
          : undefined
      }

      // Update tasks in context to show preview
      if (overColumnId === 'backlog') {
        // Preview in backlog
        const updatedBacklogTasks = [...backlogTasks, previewTask]
        // Update backlog context with preview
        updateBacklogPreview(updatedBacklogTasks)
      } else if (overColumnId.startsWith('calendar')) {
        // Preview in calendar
        const date = overColumnId.split('-')[1]
        const updatedDailyTasks = {
          ...dailyTasks,
          [date]: {
            date,
            tasks: [...(dailyTasks[date]?.tasks || []), previewTask]
          }
        }
        // Update tasks context with preview
        // You'll need to add a method to your context to handle previews
        // updateTasksPreview(updatedDailyTasks)
      }
    } else {
      setPreviewColumnId(null)
      // Clear any previews
      clearPreviews()
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    console.log("Drag end event data:", {
      activeContainer: event.active.data.current?.sortable?.containerId,
      overContainer: event.over?.data.current?.sortable?.containerId,
      activeId: event.active.id,
      overId: event.over?.id
    })
    console.log("Active task:", activeTask)
    const { active, over } = event
    setIsDragging(false)
    setActiveTask(null)
    console.log("Active task:", activeTask)
    console.log("Over:", over)
    if (!over || !activeTask) return

    // Get the column IDs from the data attributes
    const activeColumnId = active.data.current?.sortable?.containerId?.split('-')[0]
    const overColumnId = over.data.current?.sortable?.containerId?.split('-')[0]

    // Handle drops between columns
    const overId = over.id.toString()
    if (columns.some(col => col.id === overId)) {
      // Update task status based on column
      const updatedTask = { ...activeTask }
      
      if (overId === "backlog") {
        updatedTask.calendarItem = undefined
      }
      
      // Handle moving tasks between columns
      if (activeTask) {
        const activeColumnId = active.data.current?.sortable?.containerId?.split('-')[0]
        const overColumnId = overId

        // Moving from backlog to today
        if (activeColumnId === 'backlog' && overColumnId === 'today') {
          const todayDate = format(new Date(), "yyyy-MM-dd")
          
          // First delete from backlog
          await deleteBacklogTask(activeTask.id)
          
          // Then add to today
          await addTask(todayDate, {
            ...activeTask,
            calendarItem: undefined // Clear any calendar item
          })
          
          // Refresh both contexts
          await refreshBacklog()
          await refreshTasks()
        }
        
        // Moving from backlog to calendar
        else if (activeColumnId === 'backlog' && overColumnId.startsWith('calendar')) {
          const targetDate = overColumnId.split('-')[1] // Get date from calendar-YYYY-MM-DD
          
          // Delete from backlog
          await deleteBacklogTask(activeTask.id)
          
          // Add to target date with calendar item
          await addTask(targetDate, {
            ...activeTask,
            calendarItem: {
              start: { date: targetDate },
              end: { date: targetDate }
            }
          })
          
          // Refresh both contexts
          await refreshBacklog()
          await refreshTasks()
        }
        
        // Moving from future to calendar
        else if (activeColumnId === 'future' && overColumnId.startsWith('calendar')) {
          const targetDate = overColumnId.split('-')[1]
          const sourceDate = Object.entries(dailyTasks).find(
            ([_, day]) => day.tasks.some(t => t.id === activeTask.id)
          )?.[0]
          
          if (sourceDate) {
            // Delete from source date
            await deleteTask(sourceDate, activeTask.id)
            
            // Add to target date with calendar item
            await addTask(targetDate, {
              ...activeTask,
              calendarItem: {
                start: { date: targetDate },
                end: { date: targetDate }
              }
            })
            
            // Refresh tasks
            await refreshTasks()
          }
        }
        
        // Moving from incomplete to calendar
        else if (activeColumnId === 'incomplete' && overColumnId.startsWith('calendar')) {
          const targetDate = overColumnId.split('-')[1]
          const sourceDate = Object.entries(dailyTasks).find(
            ([_, day]) => day.tasks.some(t => t.id === activeTask.id)
          )?.[0]
          
          if (sourceDate) {
            // Delete from source date
            await deleteTask(sourceDate, activeTask.id)
            
            // Add to target date with calendar item
            await addTask(targetDate, {
              ...activeTask,
              calendarItem: {
                start: { date: targetDate },
                end: { date: targetDate }
              }
            })
            
            // Refresh tasks
            await refreshTasks()
          }
        }
        
        // Moving between calendar dates
        else if (activeColumnId.startsWith('calendar') && overColumnId.startsWith('calendar')) {
          const sourceDate = activeColumnId.split('-')[1]
          const targetDate = overColumnId.split('-')[1]
          
          if (sourceDate !== targetDate) {
            // Delete from source date
            await deleteTask(sourceDate, activeTask.id)
            
            // Add to target date with updated calendar item
            await addTask(targetDate, {
              ...activeTask,
              calendarItem: {
                ...activeTask.calendarItem,
                start: { date: targetDate },
                end: { date: targetDate }
              }
            })
            
            // Refresh tasks
            await refreshTasks()
          }
        }
      }
    }
    
    // Handle reordering within backlog
    if (activeColumnId === 'backlog' && overColumnId === 'backlog') {
      const backlogTaskIds = backlogTasks.map(t => t.id)
      const oldIndex = backlogTaskIds.indexOf(active.id.toString())
      const newIndex = backlogTaskIds.indexOf(over.id.toString())

      if (oldIndex !== newIndex) {
        console.log("Reordering backlog tasks")
        const newTaskIds = [...backlogTaskIds]
        newTaskIds.splice(oldIndex, 1)
        newTaskIds.splice(newIndex, 0, active.id.toString())
        
        // Update the order in Firestore through the context
        await reorderBacklogTasks(newTaskIds)
        await refreshBacklog()
      }
    }

    // Clear previews
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
                  // isValidDropZone={
                  //   activeTask ? (
                  //     // Determine source column and check allowed destinations
                  //     (() => {
                  //       const sourceColumn = 
                  //         backlogTasks.find(t => t.id === activeTask.id) ? 'backlog' :
                  //         incompleteTasks.find(t => t.id === activeTask.id) ? 'incomplete' :
                  //         todayTasks.find(t => t.id === activeTask.id) ? 'today' :
                  //         futureTasks.find(t => t.id === activeTask.id) ? 'future' : 'calendar'
                        
                  //       return ALLOWED_DROPS[sourceColumn]?.includes(column.id as ColumnId) ?? false
                  //     })()
                  //   ) : true
                  // }
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