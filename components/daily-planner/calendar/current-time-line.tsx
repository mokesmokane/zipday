"use client"

import { useEffect, useState } from "react"
import { getHoursForRange } from "./utils"

const HOUR_HEIGHT = 60 // Height of each hour cell in pixels

interface CurrentTimeLineProps {
  timeRange: 'business' | 'all'
}

function getTimePosition(timeRange: 'business' | 'all') {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const firstHour = getHoursForRange(timeRange)[0]
  const lastHour = getHoursForRange(timeRange)[getHoursForRange(timeRange).length - 1]

  // If current time is before the first hour or after the last hour, hide the line
  if (hours < firstHour || hours > lastHour) {
    return -9999 // Position off-screen
  }

  return (hours - firstHour) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT
}

export function CurrentTimeLine({ timeRange }: CurrentTimeLineProps) {
  const [position, setPosition] = useState(getTimePosition(timeRange))

  useEffect(() => {
    // Update position immediately when timeRange changes
    setPosition(getTimePosition(timeRange))

    const timer = setInterval(() => {
      setPosition(getTimePosition(timeRange))
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [timeRange])

  // Hide the line if it's positioned off-screen
  if (position === -9999) {
    return null
  }

  return (
    <div
      className="absolute left-0 right-0 z-50 flex items-center"
      style={{ top: `${position}px` }}
    >
      <div className="bg-red-500 size-2 rounded-full" />
      <div className="bg-red-500/20 h-px flex-1" />
    </div>
  )
}
