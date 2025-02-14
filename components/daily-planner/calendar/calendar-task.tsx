"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Resizable } from "re-resizable"
import { useState } from "react"
import { EditTaskDialog } from "../edit-task-dialog"
import type { Task, Day } from "@/types/daily-task-types"
import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { getHoursForRange } from "./utils"

const HOUR_HEIGHT = 60 // Height of each hour cell in pixels

interface CalendarTaskProps {
  id: string
  task: Task
  position: { index: number; total: number }
  day?: Day
  isPreview?: boolean
  onResize?: (taskId: string, durationMinutes: number) => void
  onTaskUpdate?: (task: Task) => void
  onDeleteTask?: (taskId: string) => void
  timeRange?: 'business' | 'all'
}

// Helper to calculate task position and height
function getTaskStyle(
  task: Task,
  index: number,
  total: number,
  timeRange: 'business' | 'all' = 'all'
): CSSProperties | null {
  if (!task.calendarItem?.start) return null

  const startDate = task.calendarItem.start.dateTime
    ? new Date(task.calendarItem.start.dateTime)
    : task.calendarItem.start.date
      ? new Date(task.calendarItem.start.date)
      : null
  if (!startDate) return null
  
  const startHour = startDate.getHours()
  const startMinute = startDate.getMinutes()
  const durationMinutes = task.durationMinutes || 60
  const firstHour = getHoursForRange(timeRange)[0]

  const top = (startHour - firstHour) * HOUR_HEIGHT + (startMinute / 60) * HOUR_HEIGHT
  const height = (durationMinutes / 60) * HOUR_HEIGHT

  const width = `${100 / total}%`
  const left = `${(index * 100) / total}%`

  return {
    position: "absolute",
    top: `${top}px`,
    left,
    width,
    height: `${height}px`,
    minHeight: "30px"
  }
}

export function CalendarTask({
  id,
  task,
  position,
  day,
  isPreview = false,
  onResize,
  onTaskUpdate,
  onDeleteTask,
  timeRange = 'all'
}: CalendarTaskProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const style = getTaskStyle(task, position.index, position.total, timeRange) || {
    display: "none"
  }
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: id,
    data: {
      type: "calendar-task",
      task
    }
  })

  const dragStyle = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    touchAction: "none"
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditDialogOpen(true)
  }

  return (
    <>
      <Resizable
        key={`${style.width}-${style.height}`}
        style={dragStyle}
        size={{
          width: style.width,
          height: style.height
        }}
        enable={{ bottom: true }}
        grid={[1, 15]}
        minHeight={30}
        maxHeight={HOUR_HEIGHT * 24}
        onResizeStop={(_e, _direction, ref, _d) => {
          const newHeight = parseInt(ref.style.height)
          const newDurationMinutes = Math.round((newHeight / HOUR_HEIGHT) * 60)
          onResize?.(task.id, newDurationMinutes)
        }}
      >
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          onClick={handleClick}
          className={cn(
            "bg-primary/10 hover:bg-primary/20 h-full select-none overflow-hidden rounded p-2 text-xs transition-colors",
            isPreview && "opacity-50"
          )}
        >
          <div className="font-medium">{task.title}</div>
          {task.description && (
            <div className="text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </div>
          )}
        </div>
      </Resizable>

      {day && (
        <EditTaskDialog
          day={day}
          task={task}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={updatedTask => {
            onTaskUpdate?.(updatedTask)
            setIsEditDialogOpen(false)
          }}
          onDelete={() => {
            onDeleteTask?.(task.id)
          }}
        />
      )}
    </>
  )
}
