"use client"

import { useDroppable } from "@dnd-kit/core"

const HOUR_HEIGHT = 60 // Height of each hour cell in pixels

interface HourDroppableProps {
  id: string
  hour: number
}

export function HourDroppable({ id, hour }: HourDroppableProps) {
  const { setNodeRef, isOver: isOverHour } = useDroppable({
    id: `${id}-hour-${hour}`
  })

  return (
    <div
      ref={setNodeRef}
      className={`relative ${hour < 23 ? 'border-b' : ''} transition-colors ${isOverHour ? 'bg-accent' : 'hover:bg-accent/50'}`}
      style={{ height: `${HOUR_HEIGHT}px` }}
    />
  )
} 