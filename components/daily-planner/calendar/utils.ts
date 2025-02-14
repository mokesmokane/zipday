// Add this helper function to calculate overlapping groups
export function getOverlappingGroups(
  items: Array<{
    calendarItem?: {
      start?: { dateTime?: string }
      end?: { dateTime?: string }
    }
    durationMinutes?: number
  }>
) {
  const groups: Array<Array<number>> = []

  items
    .filter(item => item.calendarItem?.start?.dateTime)
    .forEach((item, index) => {
      const itemStart = new Date(item.calendarItem?.start?.dateTime!).getTime()
      let foundGroup = false

      for (const group of groups) {
        const firstItemInGroup = items[group[0]]
        const groupStartTime = new Date(
          firstItemInGroup.calendarItem?.start?.dateTime!
        ).getTime()

        // Only group items with exactly the same start time
        if (itemStart === groupStartTime) {
          group.push(index)
          foundGroup = true
          break
        }
      }

      if (!foundGroup) {
        groups.push([index])
      }
    })

  return groups
}

export const HOUR_HEIGHT = 60 // Height of each hour cell in pixels

export function getHoursForRange(range: 'business' | 'all') {
  if (range === 'business') {
    // Update business hours to 6-22 (6 AM to 10 PM)
    return Array.from({ length: 17 }, (_, i) => i + 6)
  }
  // All hours (0-23)
  return Array.from({ length: 24 }, (_, i) => i)
}
