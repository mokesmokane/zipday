"use client"

import { useEffect, useState } from "react"

const HOUR_HEIGHT = 60 // Height of each hour cell in pixels

function getTimePosition() {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  return (hours * HOUR_HEIGHT) + (minutes / 60 * HOUR_HEIGHT)
}

export function CurrentTimeLine() {
  const [position, setPosition] = useState(getTimePosition())

  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setPosition(getTimePosition())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div 
      className="absolute left-0 right-0 pointer-events-none z-10"
      style={{ 
        top: `${position}px`,
        transition: 'top 0.5s linear'
      }}
    >
      <div className="relative flex items-center">
        <div className="absolute -left-1 w-2 h-2 rounded-full bg-red-500" />
        <div className="w-full border-t border-red-500" />
      </div>
    </div>
  )
} 