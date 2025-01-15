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
  updateEvent: (eventId: string, updates: Partial<{ title: string, startTime: string, endTime: string, description: string }>) => Promise<void>
  deleteEvent: (eventId: string) => Promise<void>
}

export const GoogleCalendarContext = createContext<GoogleCalendarContextType>({
  isConnected: false,
  events: [],
  isLoading: false,
  error: null,
  refreshEvents: async () => {},
  updateEvent: async () => {},
  deleteEvent: async () => {}
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

  // Set up updates when connected
  useEffect(() => {
    if (!isConnected) return

    console.log("Setting up calendar updates...")

    // Initial fetch
    const fetchEvents = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/google/calendar/events")
        const { events } = await response.json()
        console.log("Initial events loaded:", events)
        setEvents(events)
        setError(null)
      } catch (error) {
        console.error("Failed to fetch calendar events:", error)
        setError("Failed to fetch calendar events")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()

    // In development, use polling
    if (process.env.NODE_ENV === 'development') {
      console.log("Development mode: Using polling for updates")
      const pollInterval = setInterval(fetchEvents, 30000) // Poll every 30 seconds
      return () => clearInterval(pollInterval)
    }

    // In production, use SSE
    console.log("Production mode: Using SSE for updates")
    const eventSource = new EventSource("/api/google/calendar/stream")

    eventSource.onopen = () => {
      console.log("SSE connection opened")
      setError(null)
    }

    eventSource.onmessage = (event) => {
      console.log("SSE message received:", event.data)
      try {
        const data = JSON.parse(event.data)
        if (data.type === "update") {
          console.log("Updating events:", data.events)
          setEvents(data.events)
        }
      } catch (error) {
        console.error("Error processing SSE message:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("SSE error:", error)
      setError("Lost connection to calendar updates")
    }

    return () => {
      console.log("Cleaning up calendar updates...")
      eventSource.close()
    }
  }, [isConnected])

  const updateEvent = async (eventId: string, updates: Partial<{ title: string, startTime: string, endTime: string, description: string }>) => {
    if (!isConnected) return

    try {
      const response = await fetch(`/api/google/calendar/events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error("Failed to update event")
      }

      // Refresh events after update
      await refreshEvents()
    } catch (error) {
      console.error("Failed to update calendar event:", error)
      setError("Failed to update calendar event")
    }
  }

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

  const deleteEvent = async (eventId: string) => {
    if (!isConnected) return

    try {
      const response = await fetch(`/api/google/calendar/events/${eventId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to delete event")
      }
      
      // Refresh events after deletion
      await refreshEvents()
    } catch (error) {
      console.error("Failed to delete calendar event:", error)
      setError("Failed to delete calendar event")
    }
  }

  return (
    <GoogleCalendarContext.Provider
      value={{
        isConnected,
        events,
        isLoading,
        error,
        refreshEvents,
        updateEvent,
        deleteEvent
      }}
    >
      {children}
    </GoogleCalendarContext.Provider>
  )
}

export function useGoogleCalendar() {
  return useContext(GoogleCalendarContext)
} 