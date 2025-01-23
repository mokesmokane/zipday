"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Resizable } from "re-resizable"
import { useState } from "react"
import { EditTaskDialog } from "../edit-task-dialog"
import type { Task, Day } from "@/types/daily-task-types"
import type { CSSProperties } from "react"

const HOUR_HEIGHT = 60 // Height of each hour cell in pixels

// Helper to calculate task position and height
function getTaskStyle(task: Task, index: number, total: number): CSSProperties | null {
  if (!task.calendarItem?.start) return null
  
  const startDate = task.calendarItem.start.dateTime ? new Date(task.calendarItem.start.dateTime) : task.calendarItem.start.date ? new Date(task.calendarItem.start.date) : null
  if (!startDate) return null
  const startHour = startDate.getHours()
  const startMinute = startDate.getMinutes()
  const durationMinutes = task.durationMinutes || 60
  
  const top = (startHour * HOUR_HEIGHT) + (startMinute / 60 * HOUR_HEIGHT)
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
  onResize, 
  onDeleteTask,
  position, 
  day,
  onTaskUpdate 
}: { 
  id: string
  task: Task
  onResize?: (taskId: string, durationMinutes: number) => void 
  position: {index: number, total: number}
  day: Day
  onTaskUpdate?: (task: Task) => void
  onDeleteTask?: (taskId: string) => void
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
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

  const style = getTaskStyle(task, position.index, position.total)
  if (!style) return null

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
          className="bg-primary/10 rounded p-2 text-xs h-full overflow-hidden select-none hover:bg-primary/20 transition-colors"
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
          onSave={(updatedTask) => {
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