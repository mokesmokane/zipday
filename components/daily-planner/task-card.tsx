"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Pencil, Trash2, Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CustomCheckbox } from "@/components/ui/custom-checkbox"
import { EditTaskDialog } from "./edit-task-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { Task, Subtask, Day } from "@/types/daily-task-types"
import { cn } from "@/lib/utils"
import { useSelectedTasks } from "@/lib/context/selected-tasks-context"
import { taskToShorthand } from "@/lib/utils/task-utils"

// Helper function to format ISO date to "HH:mm"
function formatStartTime(isoString?: string): string {
  if (!isoString) return ""
  const date = new Date(isoString)
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

// Helper function to format duration in minutes to "Hh Mm" or "Xh" or "Xm"
function formatDuration(durationMinutes?: number): string {
  if (!durationMinutes || durationMinutes <= 0) return ""
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h`
  } else {
    return `${minutes}m`
  }
}

// Helper function to get urgency badge variant
function getUrgencyVariant(urgency?: string): "default" | "destructive" | "secondary" | "outline" {
  switch (urgency) {
    case "immediate":
      return "destructive"
    case "soon":
      return "default"
    case "later":
      return "secondary"
    case "someday":
      return "outline"
    default:
      return "outline"
  }
}

// Helper function to get importance badge variant
function getImportanceVariant(importance?: string): "default" | "destructive" | "secondary" | "outline" {
  switch (importance) {
    case "critical":
      return "destructive"
    case "significant":
      return "default"
    case "valuable":
      return "secondary"
    case "optional":
      return "outline"
    default:
      return "outline"
  }
}

interface TaskCardProps {
  task: Task | undefined
  day?: Day
  isOverCalendarZone: boolean
  onDelete?: (taskId: string) => void
  onTaskUpdate?: (updatedTask: Task) => void
}

export function TaskCard({ task, day, isOverCalendarZone, onDelete, onTaskUpdate }: TaskCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const { selectTask, deselectTask, isTaskSelected } = useSelectedTasks()

  if (!task) {
    return null
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: isOverCalendarZone ? "rgb(59, 130, 246, 0.1)" : undefined,
    borderColor: isOverCalendarZone ? "rgb(59, 130, 246)" : undefined,
    opacity: isDragging ? 0.5 : 1
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    onTaskUpdate?.(updatedTask)
  }

  const handleSubtaskToggle = (subtaskId: string) => {
    if (!task) return

    const updatedSubtasks = task.subtasks.map(subtask =>
      subtask.id === subtaskId
        ? { ...subtask, completed: !subtask.completed }
        : subtask
    )

    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks,
      completed: !updatedSubtasks.find(st => st.id === subtaskId)?.completed
        ? false
        : task.completed
    }

    onTaskUpdate?.(updatedTask)
  }

  const handleSelect = () => {
    if (isTaskSelected(task.id)) {
      deselectTask(task.id)
    } else {
      selectTask(task)
    }
  }

  const handleDelete = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    onDelete?.(task.id)
    setIsDeleteDialogOpen(false)
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "bg-card relative cursor-grab touch-none active:cursor-grabbing transition-colors duration-200 group",
          isOverCalendarZone && "border-blue-500",
          isTaskSelected(task.id) && "ring-2 ring-primary"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...attributes}
        {...listeners}
      >
        {/* Action buttons that appear on hover */}
        <div 
          className={cn(
            "absolute left-1/2 -translate-x-1/2 -bottom-4 flex items-center gap-1 transition-opacity duration-200 bg-background rounded-md shadow-md p-1 border border-border",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              handleSelect()
            }}
          >
            <Check className={cn(
              "h-4 w-4",
              isTaskSelected(task.id) && "text-primary"
            )} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(taskToShorthand(task))
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditDialogOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <CardHeader className="p-4 pb-2">
          <div className="flex items-start gap-2">
            <CustomCheckbox
              id={task.id}
              className="h-6 w-6 mt-0.5"
              checked={task.completed}
              onCheckedChange={checked => {
                if (!task) return
                const updatedTask = {
                  ...task,
                  completed: checked === true
                }

                if (checked) {
                  updatedTask.subtasks = task.subtasks?.map(subtask => ({
                    ...subtask,
                    completed: true
                  }))
                }

                onTaskUpdate?.(updatedTask)
              }}
            />
            <div className="flex-1 flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h3 className="font-medium leading-none">{task.title}</h3>
                {task.description && (
                  <p className="text-xs text-muted-foreground">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-2">
              {task.subtasks.map((subtask: Subtask) => (
                <div key={subtask.id} className="flex items-center space-x-2">
                  <CustomCheckbox
                    id={subtask.id}
                    checked={subtask.completed}
                    onCheckedChange={() => handleSubtaskToggle(subtask.id)}
                  />
                  <label
                    htmlFor={subtask.id}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {subtask.text}
                  </label>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            {(task.calendarItem?.start.dateTime || task.durationMinutes) ? (
              <div className="text-muted-foreground flex items-center text-sm">
                {task.calendarItem?.start.dateTime && <Clock className="mr-1 size-3" />}
                {task.calendarItem?.start.dateTime && task.durationMinutes
                  ? `${formatStartTime(task.calendarItem?.start.dateTime)} - ${formatDuration(
                      task.durationMinutes
                    )}`
                  : task.calendarItem?.start.dateTime
                  ? formatStartTime(task.calendarItem?.start.dateTime)
                  : formatDuration(task.durationMinutes)}
              </div>
            ) : <div className="w-6" />}
            <div className="flex flex-wrap gap-1">
              {task.urgency && (
                <Badge variant={getUrgencyVariant(task.urgency)} className="text-xs">
                  {task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1)}
                </Badge>
              )}
              {task.importance && (
                <Badge variant={getImportanceVariant(task.importance)} className="text-xs">
                  {task.importance.charAt(0).toUpperCase() + task.importance.slice(1)}
                </Badge>
              )}
              {task.tags && task.tags.length > 0 && task.tags.map((tag: string) => (
                <Badge variant="secondary" className="text-xs" key={tag}>
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {day && (
        <EditTaskDialog
          day={day}
          task={task}
          onDelete={onDelete}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleTaskUpdate}
        />
      )}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}