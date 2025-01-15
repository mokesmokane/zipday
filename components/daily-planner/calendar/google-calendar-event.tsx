"use client"

import { useState, useContext } from "react"
import { Resizable, ResizeCallback } from "re-resizable"
import { Badge } from "@/components/ui/badge"
import { EditEventDialog } from "./edit-event-dialog"
import { GoogleCalendarContext } from "@/lib/context/google-calendar-context"
import type { CSSProperties } from "react"

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
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)

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
  onEventUpdate
}: GoogleCalendarEventProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [localEndTime, setLocalEndTime] = useState(endTime)
  const { updateEvent, deleteEvent } = useContext(GoogleCalendarContext)

  const style = getEventStyle(startTime, localEndTime, position.index, position.total)

  const handleResizeStop: ResizeCallback = async (_e, _direction, ref) => {
    const newHeight = parseInt(ref.style.height)
    const startDate = new Date(startTime)
    const newDurationMinutes = Math.round((newHeight / HOUR_HEIGHT) * 60)
    const updatedEndTime = new Date(startDate.getTime() + newDurationMinutes * 60000).toISOString()

    setLocalEndTime(updatedEndTime)
    await updateEvent(id, { endTime: updatedEndTime })
    onEventUpdate?.(id, { endTime: updatedEndTime })
  }

  return (
    <>
      <Resizable
        style={style}
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
          onClick={() => setIsDialogOpen(true)}
          className="h-full w-full overflow-hidden select-none cursor-pointer p-1 text-sm flex flex-col justify-between"
        >
          <div className="font-medium line-clamp-2">{title}</div>
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
        />
      )}
    </>
  )
}