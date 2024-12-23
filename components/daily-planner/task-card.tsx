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

interface TaskCardProps {
  task: Task | undefined
  day?: Day
  onTaskUpdate?: (updatedTask: Task) => void
}

export function TaskCard({ task, day, onTaskUpdate }: TaskCardProps) {
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
    opacity: isDragging ? 0.5 : undefined
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    onTaskUpdate?.(updatedTask)
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className="bg-card relative cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-medium leading-none">{task.title}</h3>
              <p className="text-xs text-muted-foreground">ID: {task.id}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditDialogOpen(true)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {task.subtasks.length > 0 && (
            <div className="space-y-2">
              {task.subtasks.map((subtask: Subtask) => (
                <div key={subtask.id} className="flex items-center space-x-2">
                  <CustomCheckbox id={subtask.id} checked={subtask.completed} />
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
            {task.tag && (
              <Badge variant="secondary" className="text-xs">
                {task.tag}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      {day && (
        <EditTaskDialog
          day={day}
          task={task}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleTaskUpdate}
        />
      )}
    </>
  )
}
