"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from "react"
import { useAuth } from "./auth-context"

interface GoogleCalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  allDay?: boolean
}

interface GoogleCalendarContextType {
  isConnected: boolean
  events: GoogleCalendarEvent[]
  isLoading: boolean
  error: string | null
  refreshEvents: () => Promise<void>
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType>({
  isConnected: false,
  events: [],
  isLoading: false,
  error: null,
  refreshEvents: async () => {}
})

export function GoogleCalendarProvider({
  children
}: {
  children: ReactNode
}) {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch("/api/google/calendar/status")
        const { connected } = await response.json()
        setIsConnected(connected)
      } catch (error) {
        console.error("Failed to check Google Calendar connection:", error)
        setError("Failed to check calendar connection")
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      checkConnection()
    }
  }, [user])

  // Fetch events when connected
  useEffect(() => {
    const fetchEvents = async () => {
      if (!isConnected) return

      try {
        setIsLoading(true)
        const response = await fetch("/api/google/calendar/events")
        const { events } = await response.json()
        setEvents(events)
        setError(null)
      } catch (error) {
        console.error("Failed to fetch calendar events:", error)
        setError("Failed to fetch calendar events")
      } finally {
        setIsLoading(false)
      }
    }

    if (isConnected) {
      fetchEvents()
    }
  }, [isConnected])

  const refreshEvents = async () => {
    if (!isConnected) return

    try {
      setIsLoading(true)
      const response = await fetch("/api/google/calendar/events")
      const { events } = await response.json()
      setEvents(events)
      setError(null)
    } catch (error) {
      console.error("Failed to refresh calendar events:", error)
      setError("Failed to refresh calendar events")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <GoogleCalendarContext.Provider
      value={{
        isConnected,
        events,
        isLoading,
        error,
        refreshEvents
      }}
    >
      {children}
    </GoogleCalendarContext.Provider>
  )
}

export function useGoogleCalendar() {
  return useContext(GoogleCalendarContext)
} 