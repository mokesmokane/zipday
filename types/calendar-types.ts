

export interface GoogleCalendarEvent {
    id: string
    title: string
    description?: string
    calendarItem?: {
      gcalEventId?: string
      start?: {
        dateTime?: string
      }
      end?: {
        dateTime?: string
      }
    }
    allDay?: boolean
  }