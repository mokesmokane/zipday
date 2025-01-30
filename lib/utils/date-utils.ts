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
