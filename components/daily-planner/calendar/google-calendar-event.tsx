"use client"

import { useState, useContext } from "react"
import { Resizable, ResizeCallback } from "re-resizable"
import { EditEventDialog } from "./edit-event-dialog"
import { GoogleCalendarContext } from "@/lib/context/google-calendar-context"
import type { CSSProperties } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { addTaskAction } from "@/actions/db/tasks-actions"
import { Task } from "@/types/daily-task-types"

const HOUR_HEIGHT = 60 // Height of each hour cell in pixels

/**
 * Helper to calculate Google Calendar event position and height.
 */
function getEventStyle(
  startTime: string,
  endTime: string,
  index: number,
  total: number
): CSSProperties {
  const startDate = new Date(startTime)
  const endDate = new Date(endTime)

  const startHour = startDate.getHours()
  const startMinute = startDate.getMinutes()
  const durationMinutes =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60)

  const top = startHour * HOUR_HEIGHT + (startMinute / 60) * HOUR_HEIGHT
  const height = (durationMinutes / 60) * HOUR_HEIGHT

  // Give each event a fraction of the width.
  const width = `${100 / total}%`
  const left = `${(index * 100) / total}%`

  return {
    position: "absolute",
    top: `${top}px`,
    left,
    width,
    height: `${Math.max(height, 15)}px`, // ensure minimal height
    minHeight: "15px",
    backgroundColor: "lightgreen",
    border: "1px dashed grey",
    borderRadius: "4px",
    padding: "4px",
    fontSize: "12px",
    // Important: let pointer events pass through so user can resize and open dialog
    pointerEvents: "auto"
  }
}

interface GoogleCalendarEventProps {
  id: string
  title: string
  startTime: string
  endTime: string
  description?: string
  position: { index: number; total: number }
  onEventUpdate?: (
    id: string,
    updates: Partial<{
      title: string
      startTime: string
      endTime: string
      description: string
    }>
  ) => void
  onAddTask: (task: Task) => void
}

/**
 * Displays a Google Calendar event in the daily calendar column,
 * allowing for manual resizing (changing the endTime).
 */
export function GoogleCalendarEvent({
  id,
  title,
  startTime,
  endTime,
  position,
  description,
  onAddTask,
  onEventUpdate
}: GoogleCalendarEventProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [localEndTime, setLocalEndTime] = useState(endTime)
  const { updateEvent, deleteEvent } = useContext(GoogleCalendarContext)
  const style = getEventStyle(
    startTime,
    localEndTime,
    position.index,
    position.total
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id,
    data: {
      type: "calendar-event",
      event: { id, title, startTime, endTime: localEndTime, description }
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

  const handleResizeStop: ResizeCallback = async (_e, _direction, ref) => {
    const newHeight = parseInt(ref.style.height)
    const startDate = new Date(startTime)
    const newDurationMinutes = Math.round((newHeight / HOUR_HEIGHT) * 60)
    const updatedEndTime = new Date(
      startDate.getTime() + newDurationMinutes * 60000
    ).toISOString()

    setLocalEndTime(updatedEndTime)
    await updateEvent(id, { endTime: updatedEndTime })
    onEventUpdate?.(id, { endTime: updatedEndTime })
  }

  const handleConvertToTask = async (eventData: {
    title: string
    startTime: string
    endTime: string
    description: string
  }) => {
    const startDate = new Date(eventData.startTime)
    const endDate = new Date(eventData.endTime)
    const durationMinutes = Math.round(
      (endDate.getTime() - startDate.getTime()) / (60 * 1000)
    )

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: eventData.title,
      description: eventData.description,
      completed: false,
      durationMinutes,
      subtasks: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      calendarItem: {
        gcalEventId: id,
        start: {
          dateTime: eventData.startTime
        },
        end: {
          dateTime: eventData.endTime
        }
      }
    }
    onAddTask?.(newTask)
  }

  return (
    <>
      <Resizable
        style={dragStyle}
        size={{
          width: style.width,
          height: style.height
        }}
        enable={{ bottom: true }}
        grid={[1, 15]}
        minHeight={15}
        maxHeight={HOUR_HEIGHT * 24}
        onResizeStop={handleResizeStop}
      >
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          onClick={() => setIsDialogOpen(true)}
          className="flex size-full cursor-pointer select-none flex-col justify-between overflow-hidden p-1 text-sm"
        >
          <div className="line-clamp-2 font-medium">{title}</div>
        </div>
      </Resizable>

      {isDialogOpen && (
        <EditEventDialog
          event={{
            id,
            title,
            startTime,
            endTime: localEndTime,
            description
          }}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={async updates => {
            await updateEvent(id, updates)
            onEventUpdate?.(id, updates)
            if (updates.endTime) {
              setLocalEndTime(updates.endTime)
            }
            setIsDialogOpen(false)
          }}
          onDelete={async () => {
            await deleteEvent(id)
            setIsDialogOpen(false)
          }}
          onConvertToTask={handleConvertToTask}
        />
      )}
    </>
  )
}
