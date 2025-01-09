"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, GripVertical, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CustomCheckbox } from "@/components/ui/custom-checkbox"
import { EditTaskDialog } from "./edit-task-dialog"
import type { Task, Subtask, Day } from "@/types/daily-task-types"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: Task | undefined
  day?: Day
  isOverDeleteZone: boolean
  onDelete?: (taskId: string) => void
  onTaskUpdate?: (updatedTask: Task) => void
}

export function TaskCard({ task, day, isOverDeleteZone, onDelete, onTaskUpdate }: TaskCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

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
    backgroundColor: isOverDeleteZone ? 'rgb(239, 68, 68, 0.1)' : undefined,
    borderColor: isOverDeleteZone ? 'rgb(239, 68, 68)' : undefined,
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
      completed: !updatedSubtasks.find(st => st.id === subtaskId)?.completed ? false : task.completed
    }

    onTaskUpdate?.(updatedTask)
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "bg-card relative cursor-grab touch-none active:cursor-grabbing transition-colors duration-200",
          isOverDeleteZone && "border-destructive"
        )}
        {...attributes}
        {...listeners}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start gap-2">
            <CustomCheckbox 
              id={task.id}
              className="h-6 w-6 mt-0.5"
              checked={task.completed}
              onCheckedChange={(checked) => {
                if (!task) return
                const updatedTask = {
                  ...task,
                  completed: checked === "indeterminate" ? undefined : checked
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
                {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1.5 -mr-1"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditDialogOpen(true)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
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
            {task.time && (
              <div className="text-muted-foreground flex items-center text-sm">
                <Clock className="mr-1 size-3" />
                {task.time}
              </div>
            )}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag: string) => (
                  <Badge variant="secondary" className="text-xs" key={tag}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
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
    </>
  )
}
