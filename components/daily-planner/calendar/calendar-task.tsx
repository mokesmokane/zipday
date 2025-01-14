"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Resizable } from "re-resizable"
import type { Task } from "@/types/daily-task-types"
import type { CSSProperties } from "react"

const HOUR_HEIGHT = 60 // Height of each hour cell in pixels

// Helper to calculate task position and height
function getTaskStyle(task: Task, index: number, total: number): CSSProperties | null {
  if (!task.startTime) return null
  
  const startDate = new Date(task.startTime)
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

export function CalendarTask({ task, onResize, position }: { 
  task: Task
  onResize?: (taskId: string, durationMinutes: number) => void 
  position: {index: number, total: number}
}) {
  const style = getTaskStyle(task, position.index, position.total)
  if (!style) return null

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: task.id,
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

  return (
    <Resizable
      key={`${style.width}-${style.height}`} // forces re-init if style changes
      style={dragStyle}
      size={{
        width: style.width,
        height: style.height
      }}
      enable={{ bottom: true }}
      grid={[1, 15]} // Snap to 15-minute intervals
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
        className="bg-primary/10 rounded p-2 text-xs h-full overflow-hidden select-none"
      >
        <div className="font-medium">{task.title}</div>
        {task.description && (
          <div className="text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </div>
        )}
      </div>
    </Resizable>
  )
}