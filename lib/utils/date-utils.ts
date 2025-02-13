import { format, isValid, parseISO } from "date-fns"

interface CalendarDateRange {
  timeMin: string
  timeMax: string
}

export function createCalendarDateRange(
  startDate: string,
  endDate: string,
  options = { debug: false }
): CalendarDateRange {

  // Validate input format (should be YYYY-MM-DD)
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateFormatRegex.test(startDate) || !dateFormatRegex.test(endDate)) {
    throw new Error(
      `Invalid date format. Expected YYYY-MM-DD, got startDate: ${startDate}, endDate: ${endDate}`
    )
  }

  // Create the full ISO strings
  const startDateTime = `${startDate}T00:00:00`
  const endDateTime = `${endDate}T23:59:59`

  // Parse and validate the dates
  const parsedStart = parseISO(startDateTime)
  const parsedEnd = parseISO(endDateTime)

  if (!isValid(parsedStart) || !isValid(parsedEnd)) {
    throw new Error(
      `Invalid date values. After parsing: startDate: ${format(
        parsedStart,
        "yyyy-MM-dd HH:mm:ss"
      )}, endDate: ${format(parsedEnd, "yyyy-MM-dd HH:mm:ss")}`
    )
  }

  // Convert to ISO strings
  const timeMin = parsedStart.toISOString()
  const timeMax = parsedEnd.toISOString()

  return { timeMin, timeMax }
}

/**
 * Gets the start date string for incomplete tasks based on the specified time range
 */
export const getIncompleteStartDateStr = (
  incompleteTimeRange: "week" | "month" | "year" | "all"
) => {
  const today = new Date()

  switch (incompleteTimeRange) {
    case "week":
      return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 7
      )
        .toISOString()
        .split("T")[0]

    case "month":
      return new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        today.getDate()
      )
        .toISOString()
        .split("T")[0]

    case "year":
      return new Date(
        today.getFullYear() - 1,
        today.getMonth(),
        today.getDate()
      )
        .toISOString()
        .split("T")[0]

    case "all":
      return new Date().toISOString().split("T")[0]

    default:
      return new Date().toISOString().split("T")[0]
  }
}

/**
 * Gets the end date string for future tasks based on the specified time range
 */
export const getFutureEndDateStr = (
  futureTimeRange: "week" | "month" | "year" | "all"
) => {
  const today = new Date()

  switch (futureTimeRange) {
    case "week":
      return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 7
      )
        .toISOString()
        .split("T")[0]

    case "month":
      return new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      )
        .toISOString()
        .split("T")[0]

    case "year":
      return new Date(
        today.getFullYear() + 1,
        today.getMonth(),
        today.getDate()
      )
        .toISOString()
        .split("T")[0]

    case "all":
      return new Date(
        today.getFullYear() + 100,
        today.getMonth(),
        today.getDate()
      )
        .toISOString()
        .split("T")[0]

    default:
      return new Date(
        today.getFullYear() + 100,
        today.getMonth(),
        today.getDate()
      )
        .toISOString()
        .split("T")[0]
  }
}
