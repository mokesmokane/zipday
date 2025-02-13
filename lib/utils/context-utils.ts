import { Task } from "@/types/daily-task-types"
import { format, parseISO } from "date-fns"
import { GoogleCalendarEvent } from "@/components/daily-planner/calendar/google-calendar-event"

interface TasksContextResult {
  text: string
  idMapping: Record<string, string>
}

interface IdMappingResult {
  mapping: Record<string, number>
  reverseMapping: Record<string, string>
}

/**
 * Creates or updates a mapping between task IDs and short numeric IDs
 * @param tasks List of tasks to create mappings for
 * @param existingMapping Existing mapping to add to (optional)
 * @returns Object containing forward and reverse ID mappings
 */
export function createIdMapping(tasks: Task[], existingMapping: Record<string, string | number> = {}): IdMappingResult {
  
  const mapping: Record<string, number> = {}
  const reverseMapping: Record<string, string> = {}
  
  // Convert existing mapping to numbers and populate reverse mapping
  for (const [key, value] of Object.entries(existingMapping)) {
    mapping[key] = typeof value === 'string' ? parseInt(value) : value
    reverseMapping[mapping[key].toString()] = key
  }

  // Get the next available number
  const nextNumber = Object.keys(reverseMapping).length + 1

  try {
    // Add new mappings
    tasks.forEach((task, index) => {
      if (!mapping[task.id]) {
        const shortId = nextNumber + index
        mapping[task.id] = shortId
        reverseMapping[shortId.toString()] = task.id
      }
    })
  } catch (error) {
    console.error("tasks mapping error", tasks)
    console.error("Error creating ID mapping:", error)
    throw error
  }

  return { mapping, reverseMapping }
}
/**
 * Creates or updates a mapping between task IDs and short numeric IDs
 * @param tasks List of tasks to create mappings for
 * @param existingMapping Existing mapping to add to (optional)
 * @returns Object containing forward and reverse ID mappings
 */
export function createCalendarIdMapping(events: any[], existingMapping: Record<string, string | number> = {}): IdMappingResult {
  
  const mapping: Record<string, number> = {}
  const reverseMapping: Record<string, string> = {}
  
  // Convert existing mapping to numbers and populate reverse mapping
  for (const [key, value] of Object.entries(existingMapping)) {
    mapping[key] = typeof value === 'string' ? parseInt(value) : value
    reverseMapping[mapping[key].toString()] = key
  }

  // Get the next available number
  const nextNumber = Object.keys(reverseMapping).length + 1

  // Add new mappings
  events.forEach((event, index) => {
    if (!mapping[event.id]) {
      const shortId = nextNumber + index
      mapping[event.id] = shortId
      reverseMapping[shortId.toString()] = event.id
    }
  })

  return { mapping, reverseMapping }
}

export function formatCalendarContext(events: any[]): string {
  return formatCalendarEvents(events)
}

/**
 * Formats tasks into a readable text format
 * @param title Title for the task section
 * @param tasks List of tasks to format
 * @param idMapping Mapping from task IDs to short IDs
 * @returns Formatted text string
 */
export function formatTasksContext(
  title: string,
  tasks: Task[],
  idMapping: Record<string, string | number>
): string {
  if (!tasks.length) return ""

  const formattedTasks = tasks
    .map(task => {
      const metadata = []
      if (task.urgency) metadata.push(`Urgency: ${task.urgency}`)
      if (task.importance) metadata.push(`Importance: ${task.importance}`)
      if (task.durationMinutes)
        metadata.push(`Duration: ${task.durationMinutes}m`)
      if (task.tags?.length) metadata.push(`Tags: ${task.tags.join(", ")}`)
      if (task.calendarItem?.start?.dateTime) {
        const startTime = format(
          parseISO(task.calendarItem.start.dateTime),
          "h:mm a"
        )
        const endTime = task.calendarItem?.end?.dateTime
          ? format(parseISO(task.calendarItem.end.dateTime), "h:mm a")
          : undefined
        metadata.push(`Time: ${startTime}${endTime ? ` - ${endTime}` : ""}`)
      }

      let taskStr = `  - [${task.completed ? "x" : " "}] ${task.title} (#${idMapping[task.id]})`
      if (task.description) taskStr += `\n    Description: ${task.description}`
      if (metadata.length) taskStr += `\n    (${metadata.join(" | ")})`
      if (task.subtasks?.length) {
        taskStr += "\n    Subtasks:"
        task.subtasks.forEach(subtask => {
          taskStr += `\n    - [${subtask.completed ? "x" : " "}] ${subtask.text} (#${idMapping[subtask.id]})`
        })
      }
      return taskStr
    })
    .join("\n")

  return `
${title}:
${formattedTasks}
`
}

export function formatTasksContextForDayTasks(
  title: string,
  tasksByDay: Record<string, Task[]>,
  idMapping: Record<string, string>
): string {
  let formattedTasks = ""
  for (const day of Object.keys(tasksByDay)) {
    formattedTasks += formatTasksContext(`${title} for ${day}`, tasksByDay[day], idMapping)
  }
  return formattedTasks
}

/**
 * Formats calendar events into a readable text format
 * @param events List of calendar events to format
 * @returns Formatted text string
 */
export function formatCalendarEvents(events: any[]): string {
  if (!events.length) return ""

  const formattedEvents = events
    .map(event => {
      let eventStr = `  - ${event.title}`
      if (event.calendarItem?.start?.dateTime) {
        const startTime = format(
          parseISO(event.calendarItem.start.dateTime),
          "h:mm a"
        )
        const endTime = event.calendarItem?.end?.dateTime
          ? format(parseISO(event.calendarItem.end.dateTime), "h:mm a")
          : undefined
        eventStr += ` (${startTime}${endTime ? ` - ${endTime}` : ""})`
      }
      if (event.description)
        eventStr += `\n    Description: ${event.description}`
      return eventStr
    })
    .join("\n")

  return `
Calendar Events:
${formattedEvents}
`
}
