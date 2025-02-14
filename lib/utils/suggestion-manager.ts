import { Task } from "@/types/daily-task-types"
import { EntryStage } from "./entry-stage-manager"
import { format, addMinutes, isAfter, isBefore, parse } from "date-fns"
import { GoogleCalendarEvent } from "@/types/calendar-types"
import { parseTaskInput } from "./task-parser"

export interface SuggestionOptions {
  categoryOptions?: string[]
  durationOptions?: string[]
  timeOptions?: string[]
  events?: GoogleCalendarEvent[]
}

export const DEFAULT_OPTIONS: SuggestionOptions = {
  categoryOptions: ['work', 'personal', 'health', 'errands', 'meeting'],
  durationOptions: ['30m', '1h', '1h30m', '2h', '3h', '4h'],
  timeOptions: [], // Will be generated dynamically
  events: []
}

interface GetAISuggestionsParams {
  currentTask: string | null
  contextTasks: Task[]
  completionType: EntryStage
  currentText: string
}

export interface SuggestionManager {
  getAISuggestions: (params: GetAISuggestionsParams) => Promise<string[]>
}

export function generateTimeSlots(events: GoogleCalendarEvent[] = [], selectedDate: Date): string[] {
  console.log("events", events.map(event => event.calendarItem?.start?.dateTime))
  console.log("selectedDate", selectedDate)
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  
  // Round up to the nearest 30 minutes
  const startMinute = Math.ceil(currentMinute / 30) * 30
  let startTime = new Date(now)
  startTime.setMinutes(startMinute)
  startTime.setSeconds(0)
  startTime.setMilliseconds(0)
  
  // If we're past the current hour's 30-minute mark, move to the next hour
  if (startMinute >= 60) {
    startTime.setHours(currentHour + 1)
    startTime.setMinutes(0)
  }

  // Generate time slots for the rest of the day
  const timeSlots: string[] = []
  const endOfDay = new Date(now)
  endOfDay.setHours(23)
  endOfDay.setMinutes(30)

  // Get occupied time slots from tasks
  const occupiedSlots = events
    .filter(event => event.calendarItem?.start?.dateTime)
    .map(event => {
      const startDateTime = event.calendarItem?.start?.dateTime!
      const eventDate = startDateTime.split('T')[0]
      // Only process events for the current date
      if (eventDate !== selectedDate.toISOString().split('T')[0]) {
        return null
      }
      
      // Parse the dates and handle timezone offsets
      const start = new Date(startDateTime)
      const end = event.calendarItem?.end?.dateTime 
        ? new Date(event.calendarItem.end.dateTime)
        : addMinutes(start, 60) // Default 1 hour if no duration specified

      // Convert to local time by using UTC methods to avoid timezone issues
      const startLocal = new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate(),
        start.getUTCHours(),
        start.getUTCMinutes()
      ))
      const endLocal = new Date(Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        end.getUTCDate(),
        end.getUTCHours(),
        end.getUTCMinutes()
      ))

      return { start: startLocal, end: endLocal }
    })
    .filter((slot): slot is { start: Date; end: Date } => slot !== null)

  // Generate available time slots
  while (isBefore(startTime, endOfDay) || format(startTime, 'HH:mm') === '23:30') {
    const currentSlot = format(startTime, 'HH:mm')
    const slotEnd = addMinutes(startTime, 30)
    
    // Don't add slots after 23:30
    if (currentSlot > '23:30') {
      break
    }

    const isSlotAvailable = !occupiedSlots.some(slot => 
      (isAfter(startTime, slot.start) && isBefore(startTime, slot.end)) ||
      (isAfter(slotEnd, slot.start) && isBefore(slotEnd, slot.end)) ||
      (isBefore(startTime, slot.start) && isAfter(slotEnd, slot.end)) ||
      format(startTime, 'HH:mm') === format(slot.start, 'HH:mm') ||
      format(slotEnd, 'HH:mm') === format(slot.end, 'HH:mm')
    )

    if (isSlotAvailable) {
      timeSlots.push(currentSlot)
    }

    startTime = slotEnd
  }

  return timeSlots
}

export function generateDurations(events: GoogleCalendarEvent[] = [], selectedDate: Date, startTime?: string): string[] {
  // If no start time is provided, return default durations
  if (!startTime) {
    return DEFAULT_OPTIONS.durationOptions || []
  }

  // Parse the start time - handle both UTC and local formats
  let startDateTime: Date
  if (startTime.endsWith('Z')) {
    // If UTC time, create date directly
    startDateTime = new Date(startTime)
  } else {
    // If local time, parse with date-fns
    const timeStr = `${format(selectedDate, 'yyyy-MM-dd')}T${startTime}`
    startDateTime = parse(timeStr, "yyyy-MM-dd'T'HH:mm", new Date())
  }

  // Find the next event after the start time
  const nextEvent = events
    .filter(event => event.calendarItem?.start?.dateTime)
    .map(event => ({
      start: new Date(event.calendarItem!.start!.dateTime!),
      end: event.calendarItem!.end?.dateTime 
        ? new Date(event.calendarItem!.end.dateTime)
        : addMinutes(new Date(event.calendarItem!.start!.dateTime!), 60)
    }))
    .filter(event => 
      format(event.start, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') &&
      isAfter(event.start, startDateTime)
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0]

  // Calculate end boundary (either next event or end of day)
  const endOfDay = new Date(selectedDate)
  endOfDay.setHours(23, 59, 59)
  
  const boundaryTime = nextEvent ? nextEvent.start : endOfDay
  
  // Calculate available minutes
  const availableMinutes = Math.floor(
    (boundaryTime.getTime() - startDateTime.getTime()) / (1000 * 60)
  )

  console.log('Available minutes:', availableMinutes, 'between', format(startDateTime, 'HH:mm'), 'and', format(boundaryTime, 'HH:mm'))

  // Convert default durations to minutes for comparison
  const durationInMinutes = (durationStr: string): number => {
    const hours = durationStr.match(/(\d+)h/)?.[1] || '0'
    const minutes = durationStr.match(/(\d+)m/)?.[1] || '0'
    return parseInt(hours) * 60 + parseInt(minutes)
  }

  // Filter durations that fit within available time
  return (DEFAULT_OPTIONS.durationOptions || []).filter(duration => {
    const mins = durationInMinutes(duration)
    const fits = mins <= availableMinutes
    console.log('Duration', duration, '=', mins, 'minutes, fits?', fits)
    return fits
  })
}

export async function getSuggestions(
  currentTask: string,
  currentText: string,
  entryStage: EntryStage,
  suggestionManager: SuggestionManager,
  options: SuggestionOptions = DEFAULT_OPTIONS,
  selectedDate: Date
): Promise<string[]> {
    const task = parseTaskInput(currentTask)[0]
  // Get the current line text without any prefixes
  const textWithoutPrefix = currentText
    .trim()
    .replace(/^-\s*/, '') // Remove subtask prefix
    .replace(/^#\s*/, '') // Remove category prefix
    .replace(/^@\s*/, '') // Remove time prefix
    .toLowerCase() // Case insensitive matching

  switch (entryStage) {
    case 'title':
    case 'subtask': {
      const completions = await suggestionManager.getAISuggestions({
        currentTask: currentTask,
        contextTasks: [],
        completionType: entryStage,
        currentText
      })
      return completions
    }

    case 'category': {
      const categories = options.categoryOptions || DEFAULT_OPTIONS.categoryOptions!
      return textWithoutPrefix
        ? categories.filter(cat => 
            cat.toLowerCase().startsWith(textWithoutPrefix)
          )
        : categories
    }

    case 'duration': {
      console.log("task", task)
      console.log("currentTask", currentTask)
      const durations = generateDurations(options.events, selectedDate, task.calendarItem?.start?.dateTime)
      return durations
    }

    case 'time': {
      const timeSlots = generateTimeSlots(options.events, selectedDate)
      return textWithoutPrefix
        ? timeSlots.filter(time => time.startsWith(textWithoutPrefix))
        : timeSlots
    }

    default:
      return []
  }
} 