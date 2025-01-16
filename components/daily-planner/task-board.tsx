"use client"

import { useState } from "react"
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { format, isToday } from "date-fns"
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

interface TaskBoardProps {
  today: Day
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  onTaskUpdate: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

export function TaskBoard({ today, selectedDate, setSelectedDate, onTaskUpdate, onDeleteTask }: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isOverCalendarZone, setIsOverCalendarZone] = useState<string | null>(null)
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const { incompleteTasks, futureTasks, backlogTasks, dailyTasks } = useTasks()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const todayTasks = dailyTasks[today.date]?.tasks || []

  const columns = [
    { id: "backlog", title: "Backlog", tasks: backlogTasks },
    { id: "incomplete", title: "Incomplete", tasks: incompleteTasks },
    { id: "today", title: "Today", tasks: todayTasks },
    { id: "future", title: "Future", tasks: futureTasks },
  ]

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const task = todayTasks.find(t => t.id === active.id)
    if (task) {
      setActiveTask(task)
      setIsDragging(true)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event
    if (!over) {
      setIsOverCalendarZone(null)
      return
    }

    const isOverCalendarZone = over.id.toString().includes("-calendar-zone")
    if (isOverCalendarZone) {
      const columnId = over.id.toString().split("-calendar-zone")[0]
      setIsOverCalendarZone(columnId)
    } else {
      setIsOverCalendarZone(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setIsDragging(false)
    setActiveTask(null)
    setIsOverCalendarZone(null)

    if (!over || !activeTask) return

    // Handle drops between columns
    const overId = over.id.toString()
    if (columns.some(col => col.id === overId)) {
      // Update task status based on column
      const updatedTask = { ...activeTask }
      
      if (overId === "backlog") {
        updatedTask.calendarItem = undefined
      }
      
      onTaskUpdate(updatedTask)
    }
  }

  return (
    <div className="relative size-full">
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 h-full  px-6">
        {columns.map(column => (
          <div key={column.id} className="w-[300px]">
            <div className="mb-4 flex justify-between items-center">
                    <div className="space-y-1.5">
                      <h2 className="text-lg font-semibold">
                        {column.title}
                      </h2>
                    </div>            
                    {(column.id === "backlog" || column.id === "today") && (

                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7 rounded-lg"
                      onClick={() => setIsNewTaskDialogOpen(true)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  )}
                  </div>
            <SortableContext
              items={column.tasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <TaskColumn
                id={column.id}
                isDragging={isDragging}
                isOverCalendarZone={isOverCalendarZone === column.id}
                showCalendarZone={true}
              >
                {column.tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    day={today}
                    isOverCalendarZone={isOverCalendarZone === column.id && activeTask?.id === task.id}
                    onDelete={onDeleteTask}
                    onTaskUpdate={onTaskUpdate}
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
            onDeleteTask={onDeleteTask}
            onTaskUpdate={onTaskUpdate}
            onAddTask={task => {
              const updatedTask = { ...task }
              onTaskUpdate(updatedTask)
            }}
          />
        </div>
      </div>

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
        onSave={task => {
          onTaskUpdate(task)
          setIsNewTaskDialogOpen(false)
        }}
      />
    </DndContext>
    </div>
  )
} 