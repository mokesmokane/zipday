import { Task } from "@/types/daily-task-types"
import {
  createIdMapping,
  formatTasksContext,
  formatCalendarEvents
} from "../context-utils"

describe("createIdMapping", () => {
  const tasks: Task[] = [
    {
      id: "task1",
      title: "Task 1",
      completed: false,
      createdAt: "2024-03-20T00:00:00Z",
      updatedAt: "2024-03-20T00:00:00Z",
      subtasks: []
    },
    {
      id: "task2",
      title: "Task 2",
      completed: false,
      createdAt: "2024-03-20T00:00:00Z",
      updatedAt: "2024-03-20T00:00:00Z",
      subtasks: []
    }
  ]

  it("creates new mappings starting from 1", () => {
    const { mapping, reverseMapping } = createIdMapping(tasks)
    expect(mapping).toEqual({
      task1: 1,
      task2: 2
    })
    expect(reverseMapping).toEqual({
      1: "task1",
      2: "task2"
    })
  })
})

describe("formatTasksContext", () => {
  const tasks: Task[] = [
    {
      id: "task1",
      title: "Task 1",
      completed: false,
      createdAt: "2024-03-20T00:00:00Z",
      updatedAt: "2024-03-20T00:00:00Z",
      subtasks: []
    }
  ]

  it("formats tasks with basic information", () => {
    const idMapping = { task1: 1 }
    const result = formatTasksContext("Test Tasks", tasks, idMapping)
    expect(result).toContain("Test Tasks:")
    expect(result).toContain("[") // Check for checkbox
    expect(result).toContain("#1") // Check for ID
    expect(result).toContain("Task 1") // Check for title
  })

  it("formats tasks with all metadata", () => {
    const taskWithMetadata: Task = {
      id: "task1",
      title: "Task with metadata",
      description: "Test description",
      completed: true,
      urgency: "immediate",
      importance: "critical",
      durationMinutes: 30,
      tags: ["test", "important"],
      calendarItem: {
        start: { dateTime: "2024-03-20T09:00:00Z" },
        end: { dateTime: "2024-03-20T10:00:00Z" }
      },
      subtasks: [
        { id: "subtask1", text: "Subtask 1", completed: false },
        { id: "subtask2", text: "Subtask 2", completed: true }
      ],
      createdAt: "2024-03-20T00:00:00Z",
      updatedAt: "2024-03-20T00:00:00Z"
    }

    const idMapping = { task1: 1 }
    const result = formatTasksContext(
      "Test Tasks",
      [taskWithMetadata],
      idMapping
    )

    expect(result).toContain("Test Tasks:")
    expect(result).toContain("[x]") // Completed checkbox
    expect(result).toContain("#1") // ID
    expect(result).toContain("Task with metadata") // Title
    expect(result).toContain("Test description") // Description
    expect(result).toContain("Urgency: immediate")
    expect(result).toContain("Importance: critical")
    expect(result).toContain("Duration: 30m")
    expect(result).toContain("Tags: test, important")
    expect(result).toContain("Time: ") // Time info
    expect(result).toContain("Subtasks:")
    expect(result).toContain("[ ] Subtask 1") // Uncompleted subtask
    expect(result).toContain("[x] Subtask 2") // Completed subtask
  })

  it("returns empty string for empty task list", () => {
    const idMapping = {}
    const result = formatTasksContext("Test Tasks", [], idMapping)
    expect(result).toBe("")
  })
})

describe("formatCalendarEvents", () => {
  const events = [
    {
      title: "Test Event",
      description: "Test Description",
      calendarItem: {
        start: { dateTime: "2024-03-20T09:00:00Z" },
        end: { dateTime: "2024-03-20T10:00:00Z" }
      }
    }
  ]

  it("formats calendar events with all information", () => {
    const result = formatCalendarEvents(events)
    expect(result).toContain("Calendar Events:")
    expect(result).toContain("Test Event")
    expect(result).toContain("Test Description")
    expect(result).toContain("Description:")
  })

  it("returns empty string for empty events list", () => {
    const result = formatCalendarEvents([])
    expect(result).toBe("")
  })
})

describe("continuous ID mapping across sections", () => {
  const scheduledTasks: Task[] = [
    {
      id: "scheduled1",
      title: "Scheduled Task 1",
      completed: false,
      createdAt: "2024-03-20T00:00:00Z",
      updatedAt: "2024-03-20T00:00:00Z",
      subtasks: []
    }
  ]

  const unscheduledTasks: Task[] = [
    {
      id: "unscheduled1",
      title: "Unscheduled Task 1",
      completed: false,
      createdAt: "2024-03-20T00:00:00Z",
      updatedAt: "2024-03-20T00:00:00Z",
      subtasks: []
    }
  ]

  const incompleteTasks: Task[] = [
    {
      id: "incomplete1",
      title: "Incomplete Task 1",
      completed: false,
      createdAt: "2024-03-20T00:00:00Z",
      updatedAt: "2024-03-20T00:00:00Z",
      subtasks: []
    }
  ]
})
