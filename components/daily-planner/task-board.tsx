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

interface TaskBoardProps {
  tasks: Task[]
  today: Day
  selectedDate: Date
  onTaskUpdate: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

export function TaskBoard({ tasks, today, selectedDate, onTaskUpdate, onDeleteTask }: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isOverCalendarZone, setIsOverCalendarZone] = useState<string | null>(null)
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Filter tasks into columns
  const backlogTasks = tasks.filter(task => !task.calendarItem && !task.completed)
  const incompleteTasks = tasks.filter(task => task.calendarItem && !task.completed)
  const scheduledTasks = tasks.filter(task => task.calendarItem && !task.completed)
  const todayTasks = tasks.filter(task => {
    if (!task.calendarItem?.start?.dateTime) return false
    return isToday(new Date(task.calendarItem.start.dateTime))
  })

  const columns = [
    { id: "backlog", title: "Backlog", tasks: backlogTasks },
    { id: "incomplete", title: "Incomplete", tasks: incompleteTasks },
    { id: "scheduled", title: "Scheduled", tasks: scheduledTasks },
    { id: "today", title: "Today", tasks: todayTasks }
  ]

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
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
            <h2 className="font-semibold mb-4">{column.title}</h2>
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

            {column.id === "backlog" && (
              <Button
                variant="outline"
                className="mt-4 w-full justify-start"
                onClick={() => setIsNewTaskDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add task
              </Button>
            )}
          </div>
        ))}

        <div className="flex-1">
          <h2 className="font-semibold mb-4">
            Calendar
            <span className="text-muted-foreground text-sm ml-2">
              {format(selectedDate, "MMM d")}
            </span>
          </h2>
          <CalendarColumn
            id={`calendar-${format(selectedDate, "yyyy-MM-dd")}`}
            date={format(selectedDate, "yyyy-MM-dd")}
            tasks={tasks.filter(task => {
              if (!task.calendarItem?.start?.dateTime) return false
              const taskDate = new Date(task.calendarItem.start.dateTime)
              return format(taskDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
            })}
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