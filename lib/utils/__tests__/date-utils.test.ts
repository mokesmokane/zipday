import { getIncompleteStartDateStr } from "../date-utils"
import { createCalendarDateRange } from "../date-utils"

describe("getIncompleteStartDateStr", () => {
  // Mock the current date to ensure consistent test results
  const mockDate = new Date("2024-01-24")

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(mockDate)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("returns date from 7 days ago for week range", () => {
    const result = getIncompleteStartDateStr("week")
    expect(result).toBe("2024-01-17")
  })

  it("returns date from 1 month ago for month range", () => {
    const result = getIncompleteStartDateStr("month")
    expect(result).toBe("2023-12-24")
  })

  it("returns date from 1 year ago for year range", () => {
    const result = getIncompleteStartDateStr("year")
    expect(result).toBe("2023-01-24")
  })

  it("returns today for all range", () => {
    const result = getIncompleteStartDateStr("all")
    expect(result).toBe("2024-01-24")
  })

  it("returns today for unknown range (default case)", () => {
    // @ts-expect-error Testing invalid input
    const result = getIncompleteStartDateStr("invalid")
    expect(result).toBe("2024-01-24")
  })
})

describe("createCalendarDateRange", () => {
  it("should handle valid date inputs", () => {
    const result = createCalendarDateRange("2025-02-02", "2025-02-04")
    expect(result.timeMin).toMatch(/^2025-02-02T00:00:00/)
    expect(result.timeMax).toMatch(/^2025-02-04T23:59:59/)
  })

  it("should throw error for invalid date format", () => {
    expect(() => createCalendarDateRange("2025/02/02", "2025-02-04")).toThrow(
      "Invalid date format"
    )
    expect(() => createCalendarDateRange("2025-02-02", "invalid")).toThrow(
      "Invalid date format"
    )
  })

  it("should handle edge of month dates", () => {
    const result = createCalendarDateRange("2025-01-31", "2025-02-01")
    expect(result.timeMin).toMatch(/^2025-01-31T00:00:00/)
    expect(result.timeMax).toMatch(/^2025-02-01T23:59:59/)
  })

  it("should handle edge of year dates", () => {
    const result = createCalendarDateRange("2024-12-31", "2025-01-01")
    expect(result.timeMin).toMatch(/^2024-12-31T00:00:00/)
    expect(result.timeMax).toMatch(/^2025-01-01T23:59:59/)
  })

  it("should handle leap year dates", () => {
    const result = createCalendarDateRange("2024-02-28", "2024-02-29")
    expect(result.timeMin).toMatch(/^2024-02-28T00:00:00/)
    expect(result.timeMax).toMatch(/^2024-02-29T23:59:59/)
  })

  it("should handle same day range", () => {
    const result = createCalendarDateRange("2025-02-02", "2025-02-02")
    expect(result.timeMin).toMatch(/^2025-02-02T00:00:00/)
    expect(result.timeMax).toMatch(/^2025-02-02T23:59:59/)
  })
})
