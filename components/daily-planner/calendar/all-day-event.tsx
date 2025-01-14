"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { EditEventDialog } from "./edit-event-dialog"

interface AllDayEventProps {
  id: string
  title: string
  startTime: string
  endTime: string
  description?: string
  onEventUpdate?: (id: string, updates: Partial<{ title: string, startTime: string, endTime: string, description: string }>) => void
}

export function AllDayEvent({ 
  id, 
  title, 
  startTime, 
  endTime, 
  description,
  onEventUpdate 
}: AllDayEventProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Badge 
        variant="secondary" 
        className="w-full cursor-pointer truncate text-left justify-start hover:bg-accent"
        onClick={() => setIsDialogOpen(true)}
      >
        {title}
      </Badge>

      <EditEventDialog
        event={isDialogOpen ? { id, title, startTime, endTime, description } : null}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={(updates) => {
          onEventUpdate?.(id, updates)
          setIsDialogOpen(false)
        }}
      />
    </>
  )
} 