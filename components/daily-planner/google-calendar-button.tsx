"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Check } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

interface GoogleCalendarButtonProps {
  onConnect?: () => Promise<void>
  onDisconnect?: () => Promise<void>
}

export function GoogleCalendarButton({
  onConnect,
  onDisconnect
}: GoogleCalendarButtonProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // TODO: Replace with actual Google Calendar connection status check
  useEffect(() => {
    // Check if user has connected their Google Calendar
    const checkConnection = async () => {
      try {
        const response = await fetch("/api/google/calendar/status")
        const { connected } = await response.json()
        setIsConnected(connected)
      } catch (error) {
        console.error("Failed to check Google Calendar connection:", error)
        setIsConnected(false)
      }
    }

    checkConnection()
  }, [])

  const handleClick = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      if (isConnected) {
        await onDisconnect?.()
        setIsConnected(false)
      } else {
        await onConnect?.()
        setIsConnected(true)
      }
    } catch (error) {
      console.error("Failed to handle Google Calendar connection:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isConnected ? "outline" : "default"}
            size="sm"
            onClick={handleClick}
            disabled={isLoading}
            className="gap-2"
          >
            {isConnected ? (
              <>
                <Check className="size-4 text-green-500" />
                <Calendar className="size-4" />
              </>
            ) : (
              <>
                <Calendar className="size-4" />
                Connect Calendar
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isConnected
            ? "Google Calendar Connected"
            : "Connect Google Calendar"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
