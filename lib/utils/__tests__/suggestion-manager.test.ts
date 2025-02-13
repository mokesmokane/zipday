import { getSuggestions, SuggestionManager } from "../suggestion-manager"
import { EntryStage } from "../entry-stage-manager"
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { GoogleCalendarEvent } from '@/types/calendar-types'
import { generateTimeSlots } from '../suggestion-manager'

// Mock suggestion manager that returns predictable results
const mockSuggestionManager: SuggestionManager = {
  getAISuggestions: async () => ["suggestion 1", "suggestion 2", "something else"]
}

// Test options with simplified data
const testOptions = {
  categoryOptions: ["work", "personal", "health"],
  durationOptions: ["30m", "1h", "2h"],
  timeOptions: ["9:00", "10:00", "14:00"]
}

describe("getSuggestions", () => {
  describe("title and subtask suggestions", () => {

    it("filters AI suggestions based on input", async () => {
      const result = await getSuggestions("som", "som", "title", mockSuggestionManager, testOptions, "2024-03-20")
      expect(result).toEqual(["suggestion 1", "suggestion 2", "something else"])
    })

    it("handles subtask prefix correctly", async () => {
      const result = await getSuggestions("Title\n- som", "- som", "subtask", mockSuggestionManager, testOptions, "2024-03-20")   
      expect(result).toEqual(["suggestion 1", "suggestion 2", "something else"])
    })
  })

  describe("category suggestions", () => {
    it("returns all categories when input is empty", async () => {
      const result = await getSuggestions("", "", "category", mockSuggestionManager, testOptions, "2024-03-20")
      expect(result).toEqual(["work", "personal", "health"])
    })

    it("returns all categories when only # is typed", async () => {
      const result = await getSuggestions("Title\n#", "#", "category", mockSuggestionManager, testOptions, "2024-03-20")
      expect(result).toEqual(["work", "personal", "health"])
    })

    it("filters categories based on input after #", async () => {
      const result = await getSuggestions("Title\n#per", "#per", "category", mockSuggestionManager, testOptions, "2024-03-20")
      expect(result).toEqual(["personal"])
    })

    it("is case insensitive", async () => {
      const result = await getSuggestions("Title\n#WORK", "#WORK", "category", mockSuggestionManager, testOptions, "2024-03-20"         )
      expect(result).toEqual(["work"])
    })
  })

  describe("duration suggestions", () => {
    it("returns all durations when input is empty", async () => {
      const result = await getSuggestions("Buy groceries\n#personal", "", "duration", mockSuggestionManager, testOptions, "2024-03-20")
      expect(result).toEqual(["30m", "1h", "2h"])
    })

    it("filters durations based on input", async () => {
      const result = await getSuggestions("Buy groceries\n#personal", "1", "duration", mockSuggestionManager, testOptions, "2024-03-20")
      expect(result).toEqual(["1h"])
    })

    it("handles no matches", async () => {
      const result = await getSuggestions("Buy groceries\n#personal", "5h", "duration", mockSuggestionManager, testOptions, "2024-03-20")
      expect(result).toEqual([])
    })
  })

  describe("time suggestions", () => {
    beforeEach(() => {
      // Set a fixed time for all tests in this describe block
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-03-20T09:15:00'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("returns all times when input is empty", async () => {
      const result = await getSuggestions(
        "Buy groceries\n#personal\n30m",
        "",
        "time",
        mockSuggestionManager,
        { ...testOptions, events: [] },
        '2024-03-20'
      )
      expect(result[0]).toBe('09:30')
      expect(result[result.length - 1]).toBe('23:30')
      expect(result).toContain('12:00')
      expect(result).toContain('15:30')
    })

    it("returns all times when only @ is typed", async () => {
      const result = await getSuggestions(
        "Buy groceries\n#personal\n30m",
        "@",
        "time",
        mockSuggestionManager,
        { ...testOptions, events: [] },
        '2024-03-20'
      )
      expect(result[0]).toBe('09:30')
      expect(result[result.length - 1]).toBe('23:30')
    })

    it("filters times based on input after @", async () => {
      const result = await getSuggestions(
        "Buy groceries\n#personal\n30m",
        "@09",
        "time",
        mockSuggestionManager,
        { ...testOptions, events: [] },
        '2024-03-20'
      )
      expect(result).toEqual(['09:30'])
    })

    it("filters times with hour prefix", async () => {
      const result = await getSuggestions(
        "Buy groceries\n#personal\n30m",
        "@1",
        "time",
        mockSuggestionManager,
        { ...testOptions, events: [] },
        '2024-03-20'
      )
      // Should return all times starting with 1 (10:00, 11:00, 12:00, etc)
      expect(result).toContain('10:00')
      expect(result).toContain('11:00')
      expect(result).toContain('12:00')
      expect(result).toContain('13:00')
      expect(result).toContain('14:00')
      expect(result).toContain('15:00')
      expect(result).toContain('16:00')
      expect(result).toContain('17:00')
      expect(result).toContain('18:00')
      expect(result).toContain('19:00')
    })
  })

  describe("time suggestions with events", () => {
    beforeEach(() => {
      // Set a fixed time for all tests in this describe block
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-03-20T09:15:00'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("excludes times that exactly match event start times", async () => {
      const events: GoogleCalendarEvent[] = [{
        id: '1',
        title: 'Test Event',
        calendarItem: {
          start: { dateTime: '2024-03-20T10:00:00' },
          end: { dateTime: '2024-03-20T11:00:00' }
        }
      }]

      const result = await getSuggestions(
        "Meeting\n#work\n30m",
        "",
        "time",
        mockSuggestionManager,
        { ...testOptions, events },
        '2024-03-20'
      )

      // 10:00 should be excluded as it's the exact start time
      expect(result).not.toContain('10:00')
      // Times before and after should be available
      expect(result).toContain('09:30')
      expect(result).toContain('11:00')
    })

    it("excludes all times within an event's duration", async () => {
      const events: GoogleCalendarEvent[] = [{
        id: '1',
        title: 'Long Meeting',
        calendarItem: {
          start: { dateTime: '2024-03-20T14:00:00' },
          end: { dateTime: '2024-03-20T16:30:00' }
        }
      }]

      const result = await getSuggestions(
        "Task\n#work\n30m",
        "",
        "time",
        mockSuggestionManager,
        { ...testOptions, events },
        '2024-03-20'
      )

      // All times within the event should be excluded
      expect(result).not.toContain('14:00')
      expect(result).not.toContain('14:30')
      expect(result).not.toContain('15:00')
      expect(result).not.toContain('15:30')
      expect(result).not.toContain('16:00')

      // Times before and after should be available
      expect(result).toContain('13:30')
      expect(result).toContain('16:30')
    })

    it("handles multiple overlapping events", async () => {
      const events: GoogleCalendarEvent[] = [
        {
          id: '1',
          title: 'Morning Meeting',
          calendarItem: {
            start: { dateTime: '2024-03-20T10:00:00' },
            end: { dateTime: '2024-03-20T11:30:00' }
          }
        },
        {
          id: '2',
          title: 'Lunch Meeting',
          calendarItem: {
            start: { dateTime: '2024-03-20T11:00:00' },
            end: { dateTime: '2024-03-20T12:30:00' }
          }
        }
      ]

      const result = await getSuggestions(
        "Task\n#work\n30m",
        "",
        "time",
        mockSuggestionManager,
        { ...testOptions, events },
        '2024-03-20'
      )

      // All times within both events should be excluded
      expect(result).not.toContain('10:00')
      expect(result).not.toContain('10:30')
      expect(result).not.toContain('11:00')
      expect(result).not.toContain('11:30')
      expect(result).not.toContain('12:00')

      // Times before and after should be available
      expect(result).toContain('09:30')
      expect(result).toContain('12:30')
    })

    it("handles events with no end time (defaults to 1 hour)", async () => {
      const events: GoogleCalendarEvent[] = [{
        id: '1',
        title: 'Quick Meeting',
        calendarItem: {
          start: { dateTime: '2024-03-20T13:00:00' }
          // No end time specified - should default to 1 hour
        }
      }]

      const result = await getSuggestions(
        "Task\n#work\n30m",
        "",
        "time",
        mockSuggestionManager,
        { ...testOptions, events },
        '2024-03-20'
      )

      // Times within the default 1-hour duration should be excluded
      expect(result).not.toContain('13:00')
      expect(result).not.toContain('13:30')

      // Times before and after should be available
      expect(result).toContain('12:30')
      expect(result).toContain('14:00')
    })

    it("ignores events on different dates", async () => {
      const events: GoogleCalendarEvent[] = [{
        id: '1',
        title: 'Tomorrow Meeting',
        calendarItem: {
          start: { dateTime: '2024-03-21T10:00:00' },
          end: { dateTime: '2024-03-21T11:00:00' }
        }
      }]

      const result = await getSuggestions(
        "Task\n#work\n30m",
        "@10",
        "time",
        mockSuggestionManager,
        { ...testOptions, events },
        '2024-03-20'
      )

      // Time should be available since event is on a different date
      expect(result).toContain('10:00')
      expect(result).toContain('10:30')
    })

    it("handles events at the start and end of day", async () => {
      const events: GoogleCalendarEvent[] = [
        {
          id: '1',
          title: 'Early Meeting',
          calendarItem: {
            start: { dateTime: '2024-03-20T09:00:00' },
            end: { dateTime: '2024-03-20T10:00:00' }
          }
        },
        {
          id: '2',
          title: 'Late Meeting',
          calendarItem: {
            start: { dateTime: '2024-03-20T23:00:00' },
            end: { dateTime: '2024-03-20T23:59:00' }
          }
        }
      ]

      const result = await getSuggestions(
        "Task\n#work\n30m",
        "",
        "time",
        mockSuggestionManager,
        { ...testOptions, events },
        '2024-03-20'
      )

      // Early and late slots should be excluded
      expect(result).not.toContain('09:30')
      expect(result).not.toContain('23:00')
      expect(result).not.toContain('23:30')

      // Middle times should be available
      expect(result).toContain('10:00')
      expect(result).toContain('22:30')
    })

    it("filters available times based on input prefix", async () => {
      const events: GoogleCalendarEvent[] = [{
        id: '1',
        title: 'Afternoon Meeting',
        calendarItem: {
          start: { dateTime: '2024-03-20T14:00:00' },
          end: { dateTime: '2024-03-20T16:00:00' }
        }
      }]

      const result = await getSuggestions(
        "Task\n#work\n30m",
        "@13",
        "time",
        mockSuggestionManager,
        { ...testOptions, events },
        '2024-03-20'
      )

      // Should only include 13:00 and 13:30 as they match the prefix and don't overlap
      expect(result).toEqual(['13:00', '13:30'])
    })
  })

  describe("edge cases", () => {
    it("handles unknown entry stage", async () => {
      const result = await getSuggestions("Title\n- subtask\n#category\n@9:30-11:00\n1h30m", "test", "description" as EntryStage, mockSuggestionManager, testOptions, "2024-03-20")
      expect(result).toEqual([])
    })

    it("handles undefined options by using defaults", async () => {
      const result = await getSuggestions("Title\n- subtask\n#category\n@9:30-11:00\n1h30m", "", "category", mockSuggestionManager, {}, "2024-03-20")
      expect(result.length).toBeGreaterThan(0)
    })

    it("trims whitespace from input", async () => {
      const result = await getSuggestions("Title\n- subtask\n", "  #work  ", "category", mockSuggestionManager, testOptions, "2024-03-20")
      expect(result).toEqual(["work"])
    })
  })
})

describe('generateTimeSlots', () => {
  let mockDate: Date

  beforeEach(() => {
    // Reset the mock date before each test
    mockDate = new Date('2024-03-20T09:15:00') // Wednesday, March 20, 2024, 9:15 AM
    jest.useFakeTimers()
    jest.setSystemTime(mockDate)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should generate time slots from current time to end of day', () => {
    const slots = generateTimeSlots([], '2024-03-20')
    
    // First slot should be 09:30 (rounded up from 09:15)
    expect(slots[0]).toBe('09:30')
    
    // Last slot should be 23:30
    expect(slots[slots.length - 1]).toBe('23:30')
    
    // Should have correct number of slots (29 slots from 09:30 to 23:30, every 30 mins)
    // 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30, 14:00,
    // 14:30, 15:00, 15:30, 16:00, 16:30, 17:00, 17:30, 18:00, 18:30, 19:00,
    // 19:30, 20:00, 20:30, 21:00, 21:30, 22:00, 22:30, 23:00, 23:30
    expect(slots).toHaveLength(29)
    
    // Check some random slots in between
    expect(slots).toContain('12:00')
    expect(slots).toContain('15:30')
    expect(slots).toContain('20:00')
  })

  it('should round up to nearest 30 minutes for start time', () => {
    // Set current time to 09:10
    jest.setSystemTime(new Date('2024-03-20T09:10:00'))
    const slots = generateTimeSlots([], '2024-03-20')
    expect(slots[0]).toBe('09:30')

    // Set current time to 09:31
    jest.setSystemTime(new Date('2024-03-20T09:31:00'))
    const slots2 = generateTimeSlots([], '2024-03-20')
    expect(slots2[0]).toBe('10:00')

    // Set current time to 09:59
    jest.setSystemTime(new Date('2024-03-20T09:59:00'))
    const slots3 = generateTimeSlots([], '2024-03-20')
    expect(slots3[0]).toBe('10:00')
  })

  it('should exclude slots that overlap with events', () => {
    const events: GoogleCalendarEvent[] = [
      {
        id: '1',
        title: 'Test Event',
        calendarItem: {
          start: { dateTime: '2024-03-20T10:00:00' },
          end: { dateTime: '2024-03-20T11:30:00' }
        }
      }
    ]

    const slots = generateTimeSlots(events, '2024-03-20')

    // These slots should be excluded due to the event
    expect(slots).not.toContain('10:00')
    expect(slots).not.toContain('10:30')
    expect(slots).not.toContain('11:00')

    // These slots should still be present
    expect(slots).toContain('09:30')
    expect(slots).toContain('11:30')
    expect(slots).toContain('12:00')
  })

  it('should handle multiple overlapping events', () => {
    const events: GoogleCalendarEvent[] = [
      {
        id: '1',
        title: 'Test Event 1',
        calendarItem: {
          start: { dateTime: '2024-03-20T10:00:00' },
          end: { dateTime: '2024-03-20T11:30:00' }
        }
      },
      {
        id: '2',
        title: 'Test Event 2',
        calendarItem: {
          start: { dateTime: '2024-03-20T11:00:00' },
          end: { dateTime: '2024-03-20T12:30:00' }
        }
      }
    ]

    const slots = generateTimeSlots(events, '2024-03-20')

    // These slots should be excluded due to the events
    expect(slots).not.toContain('10:00')
    expect(slots).not.toContain('10:30')
    expect(slots).not.toContain('11:00')
    expect(slots).not.toContain('11:30')
    expect(slots).not.toContain('12:00')

    // These slots should still be present
    expect(slots).toContain('09:30')
    expect(slots).toContain('12:30')
    expect(slots).toContain('13:00')
  })

  it('should handle events with no end time by assuming 1 hour duration', () => {
    const events: GoogleCalendarEvent[] = [
      {
        id: '1',
        title: 'Test Event',
        calendarItem: {
          start: { dateTime: '2024-03-20T10:00:00' }
          // No end time specified
        }
      }
    ]

    const slots = generateTimeSlots(events, '2024-03-20')

    // These slots should be excluded due to the 1-hour default duration
    expect(slots).not.toContain('10:00')
    expect(slots).not.toContain('10:30')

    // These slots should be present
    expect(slots).toContain('09:30')
    expect(slots).toContain('11:00')
    expect(slots).toContain('11:30')
  })

  it('should handle empty events array', () => {
    const slots = generateTimeSlots([], '2024-03-20')
    
    // Should generate all slots from current time to end of day
    expect(slots.length).toBeGreaterThan(0)
    expect(slots[0]).toBe('09:30')
    expect(slots[slots.length - 1]).toBe('23:30')
  })

  it('should handle events on different dates', () => {
    const events: GoogleCalendarEvent[] = [
      {
        id: '1',
        title: 'Test Event',
        calendarItem: {
          start: { dateTime: '2024-03-21T10:00:00' }, // Different date
          end: { dateTime: '2024-03-21T11:30:00' }
        }
      }
    ]

    const slots = generateTimeSlots(events, '2024-03-20')
    
    // Should not exclude any slots since event is on a different date
    expect(slots).toContain('10:00')
    expect(slots).toContain('10:30')
    expect(slots).toContain('11:00')
  })

  it('should handle events at the start and end of the day', () => {
    const events: GoogleCalendarEvent[] = [
      {
        id: '1',
        title: 'Morning Event',
        calendarItem: {
          start: { dateTime: '2024-03-20T09:00:00' },
          end: { dateTime: '2024-03-20T10:00:00' }
        }
      },
      {
        id: '2',
        title: 'Evening Event',
        calendarItem: {
          start: { dateTime: '2024-03-20T23:00:00' },
          end: { dateTime: '2024-03-20T23:59:00' }
        }
      }
    ]

    const slots = generateTimeSlots(events, '2024-03-20')

    // Early slots should be excluded
    expect(slots).not.toContain('09:30')
    
    // Late slots should be excluded
    expect(slots).not.toContain('23:00')
    expect(slots).not.toContain('23:30')

    // Middle slots should be present
    expect(slots).toContain('10:00')
    expect(slots).toContain('22:30')
  })
}) 