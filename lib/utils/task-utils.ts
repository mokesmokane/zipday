import type { Task } from "@/types/daily-task-types"

/**
 * Converts a task to a shorthand string format.
 * Format:
 * Title
 * Description
 * - Subtask1
 * - Subtask2
 * #Tag1
 * #Tag2
 * ! (Urgency)
 * * (Importance)
 * @HH:MM
 * XhYm
 */
export function taskToShorthand(task: Task): string {
  const lines: string[] = []

  // Title
  lines.push(task.title)

  // Description (moved up)
  if (task.description) {
    lines.push(task.description)
  }

  // Subtasks
  if (task.subtasks?.length > 0) {
    task.subtasks.forEach(subtask => {
      lines.push(`- ${subtask.text}`)
    })
  }

  // Tags
  const tags = task.tags || []
  if (tags.length > 0) {
    tags.forEach(tag => {
      lines.push(`#${tag}`)
    })
  }

  // Urgency
  if (task.urgency) {
    lines.push(
      `! (${task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1)})`
    )
  }

  // Importance (1-3 stars based on level)
  if (task.importance) {
    const importanceStars = {
      critical: "****",
      significant: "***",
      valuable: "**",
      optional: "*"
    }
    lines.push(
      `${importanceStars[task.importance]} (${task.importance.charAt(0).toUpperCase() + task.importance.slice(1)})`
    )
  }

  // Calendar time
  if (task.calendarItem?.start.dateTime) {
    const time = new Date(task.calendarItem.start.dateTime)
    const hours = time.getHours().toString().padStart(2, "0")
    const minutes = time.getMinutes().toString().padStart(2, "0")
    lines.push(`@${hours}:${minutes}`)
  }

  // Duration
  if (task.durationMinutes) {
    lines.push(`${task.durationMinutes}m`)
  }

  return lines.join("\n")
}
