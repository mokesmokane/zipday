"use client"

import { useState, useContext } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Resizable } from "re-resizable"
import { Badge } from "@/components/ui/badge"
import { EditEventDialog } from "./edit-event-dialog"
import type { CSSProperties } from "react"
import { GoogleCalendarContext } from "@/lib/context/google-calendar-context"

const HOUR_HEIGHT = 60 // Height of each hour cell in pixels

// Helper to calculate Google Calendar event position and height
function getEventStyle(startTime: string, endTime: string, index: number, total: number): CSSProperties {
  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  
  const startHour = startDate.getHours()
  const startMinute = startDate.getMinutes()
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  
  const top = (startHour * HOUR_HEIGHT) + (startMinute / 60 * HOUR_HEIGHT)
  const height = (durationMinutes / 60) * HOUR_HEIGHT
  
  // Give each event a fraction of the width. 
  // We add a small left offset so it doesn't overlap the time label.
  const width = `${100 / total}%`
  const left = `${(index * 100) / total}%`
  
  return {
    position: "absolute",
    top: `${top}px`,
    left,
    width,
    height: `${height}px`,
    minHeight: "30px",
    backgroundColor: "lightgreen",
    border: "1px dashed grey",
    borderRadius: "4px",
    padding: "4px",
    fontSize: "12px",
    pointerEvents: "none"
  }
}

interface GoogleCalendarEventProps {
  id: string
  title: string
  startTime: string     
  endTime: string
  description?: string
  position: {index: number, total: number}
  onEventUpdate?: (id: string, updates: Partial<{ title: string, startTime: string, endTime: string, description: string }>) => void
}

export function GoogleCalendarEvent({ 
  id, 
  title, 
  startTime, 
  endTime, 
  position, 
  description,
  onEventUpdate 
}: GoogleCalendarEventProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { deleteEvent } = useContext(GoogleCalendarContext)


  const style = getEventStyle(startTime, endTime, position.index, position.total)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `event-${id}`,
    data: {
      type: "calendar-event",
      event: { id, title, startTime, endTime }
    }
  })

  const dragStyle = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    pointerEvents: "all" as const,
    touchAction: "none"
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
        minHeight={30}
        maxHeight={HOUR_HEIGHT * 24}
        onResizeStop={(_e, _direction, ref, _d) => {
          const newHeight = parseInt(ref.style.height)
          const newDurationMinutes = Math.round((newHeight / HOUR_HEIGHT) * 60)
          const newEndTime = new Date(new Date(startTime).getTime() + newDurationMinutes * 60000).toISOString()
          onEventUpdate?.(id, { endTime: newEndTime })
        }}
      >
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          onClick={() => setIsDialogOpen(true)}
          className="bg-green-100 rounded p-2 text-xs h-full overflow-hidden select-none"
        >
          <div className="font-medium line-clamp-2">{title}</div>
        </div>
      </Resizable>

      <EditEventDialog
        event={isDialogOpen ? { id, title, startTime, endTime, description } : null}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={(updates) => {
          onEventUpdate?.(id, updates)
          setIsDialogOpen(false)
        }}
        onDelete={async (eventId) => {
          await deleteEvent(eventId)
          setIsDialogOpen(false)
        }}
      />
    </>
  )
}