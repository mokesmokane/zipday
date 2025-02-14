"use client"

import { useDroppable } from "@dnd-kit/core"
import { getHoursForRange } from "./utils"

const HOUR_HEIGHT = 60 // Height of each hour cell in pixels

interface HourDroppableProps {
  id: string
  hour: number
  timeRange: 'business' | 'all'
}

export function HourDroppable({ id, hour, timeRange }: HourDroppableProps) {
  const { setNodeRef, isOver: isOverHour } = useDroppable({
    id: `${id}-hour-${hour}`
  })
  const firstHour = getHoursForRange(timeRange)[0]
  const isBusinessHour = hour >= 9 && hour <= 17
  const isLateNightEarlyMorning = hour <= 5 || hour >= 22

  return (
    <div
      ref={setNodeRef}
      className={`relative ${hour < 23 ? "border-b" : ""} transition-colors ${
        isOverHour 
          ? "bg-accent" 
          : isBusinessHour 
            ? "hover:bg-accent/50" 
            : isLateNightEarlyMorning
              ? "bg-gray-200/65 dark:bg-gray-700 hover:bg-accent/50"
              : "bg-muted hover:bg-accent/50"
      }`}
      style={{ 
        height: `${HOUR_HEIGHT}px`,
        top: `${(hour - firstHour) * HOUR_HEIGHT}px`,
        position: 'absolute',
        left: 0,
        right: 0
      }}
    />
  )
}
