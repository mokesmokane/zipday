"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { EditEventDialog } from "./edit-event-dialog"

interface AllDayEventProps {
  id: string
  title: string
  description?: string
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

export function AllDayEvent({
  id,
  title,
  description,
  onEventUpdate
}: AllDayEventProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Badge
        variant="secondary"
        className="hover:bg-accent w-full cursor-pointer justify-start truncate text-left"
        onClick={() => setIsDialogOpen(true)}
      >
        {title}
      </Badge>

      <EditEventDialog
        event={isDialogOpen ? { id, title, description } : null}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={updates => {
          onEventUpdate?.(id, updates)
          setIsDialogOpen(false)
        }}
      />
    </>
  )
}
