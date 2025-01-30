import { Task, Importance, Urgency } from "@/types/daily-task-types"
import { v4 as uuidv4 } from "uuid"

interface ParsedMetadata {
  importance: Importance | undefined
  urgency: Urgency | undefined
  durationMinutes: number | undefined
}

function numberToImportance(num: number): Importance | undefined {
  switch (num) {
    case 4:
      return "critical"
    case 3:
      return "significant"
    case 2:
      return "valuable"
    case 1:
      return "optional"
    default:
      return undefined
  }
}

function numberToUrgency(num: number): Urgency | undefined {
  switch (num) {
    case 4:
      return "immediate"
    case 3:
      return "soon"
    case 2:
      return "later"
    case 1:
      return "someday"
    default:
      return undefined
  }
}

export function parseDuration(line: string): number | undefined {
  // Match patterns like "1h", "30m", "1.5h", "1h30m", "90m", "45 min", "1 hour"
  const hourMatch = line.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/i)
  const minuteMatch = line.match(/^(\d+)\s*m(?:in(?:utes?)?)?$/i)
  const combinedMatch = line.match(/^(\d+)\s*h\s*(\d+)\s*m$/i)

  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]) * 60)
  }
  if (minuteMatch) {
    return parseInt(minuteMatch[1])
  }
  if (combinedMatch) {
    return parseInt(combinedMatch[1]) * 60 + parseInt(combinedMatch[2])
  }
  return undefined
}

export function parseMetadata(line: string): ParsedMetadata | undefined {
  // Match combined importance/urgency markers at the start of the line
  // This will match patterns like "!!", "**", "!!**", "**!!", etc.
  const metadataMatch = line.match(/^([!*]+)/)
  const durationMatch = parseDuration(line)

  if (!metadataMatch && !durationMatch) {
    return undefined
  }

  let importanceNum = 0
  let urgencyNum = 0

  if (metadataMatch) {
    const markers = metadataMatch[1]
    // Count ! and * separately
    const importanceCount = (markers.match(/!/g) || []).length
    const urgencyCount = (markers.match(/\*/g) || []).length

    // Return undefined if either count is invalid
    if (importanceCount > 4 || urgencyCount > 4) {
      return undefined
    }

    importanceNum = importanceCount
    urgencyNum = urgencyCount
  }

  return {
    importance: numberToImportance(importanceNum),
    urgency: numberToUrgency(urgencyNum),
    durationMinutes: durationMatch
  }
}

export function parseTaskInput(input: string): Task[] {
  const tasks: Task[] = []
  const taskBlocks = input.split("\n\n").filter(Boolean)

  for (const block of taskBlocks) {
    const lines = block.split("\n")
    if (lines.length === 0) continue

    let title = lines[0].trim()
    let subtasks = []
    let tags = []
    let durationMinutes = undefined
    let calendarItem = undefined
    let description = []
    let importance: Importance | undefined
    let urgency: Urgency | undefined

    // Check title for importance/urgency markers
    const titleMetadata = parseMetadata(title)
    if (titleMetadata) {
      importance = titleMetadata.importance
      urgency = titleMetadata.urgency
      // Remove markers from title
      title = title.replace(/^[!*]+/, "").trim()
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      if (line.startsWith("-")) {
        // Subtask
        subtasks.push({
          id: uuidv4(),
          text: line.slice(1).trim(),
          completed: false
        })
      } else if (line.startsWith("#")) {
        // Tag
        tags.push(line.slice(1).trim())
      } else if (line.startsWith("@")) {
        // Time in @HH:MM format
        const timeMatch = line.match(/@(\d{1,2}):(\d{2})/)
        if (timeMatch) {
          const [_, hours, minutes] = timeMatch
          const date = new Date()
          date.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          calendarItem = {
            start: {
              dateTime: date.toISOString()
            }
          }
        }
      } else {
        // Check for metadata on separate lines
        const metadata = parseMetadata(line)
        if (metadata) {
          // Take the "higher" priority value if multiple are specified
          importance = [metadata.importance, importance]
            .filter((x): x is Importance => x !== undefined)
            .sort((a, b) => {
              const order = [
                "critical",
                "significant",
                "valuable",
                "optional",
                "none"
              ]
              return order.indexOf(a) - order.indexOf(b)
            })[0] as Importance

          urgency = [metadata.urgency, urgency]
            .filter((x): x is Urgency => x !== undefined)
            .sort((a, b) => {
              const order = ["immediate", "soon", "later", "someday", "none"]
              return order.indexOf(a) - order.indexOf(b)
            })[0] as Urgency

          if (metadata.durationMinutes)
            durationMinutes = metadata.durationMinutes
        } else {
          // Any other non-empty line goes to description
          description.push(line)
        }
      }
    }

    const now = new Date().toISOString()
    tasks.push({
      id: uuidv4(),
      title,
      description: description.length > 0 ? description.join("\n") : undefined,
      subtasks,
      tags,
      durationMinutes,
      calendarItem,
      importance,
      urgency,
      completed: false,
      createdAt: now,
      updatedAt: now
    })
  }

  return tasks
}
