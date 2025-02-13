import { taskToShorthand } from "../task-utils"
import type { Task } from "@/types/daily-task-types"

describe("taskToShorthand", () => {
  const now = new Date().toISOString()

  it("should format a task with all fields", () => {
    const task: Task = {
      id: "1",
      title: "Reflection & Planning",
      subtasks: [
        { id: "s1", text: "Review weekly goals", completed: false },
        { id: "s2", text: "Set priorities for next week", completed: false }
      ],
      tags: ["PersonalDevelopment"],
      calendarItem: {
        start: { dateTime: "2024-03-20T15:00:00.000Z" },
        end: { dateTime: "2024-03-20T16:00:00.000Z" }
      },
      durationMinutes: 60,
      description: "Weekly planning session",
      completed: false,
      createdAt: now,
      updatedAt: now
    }

    const expected = `Reflection & Planning
Weekly planning session
- Review weekly goals
- Set priorities for next week
#PersonalDevelopment
@15:00
60m`

    expect(taskToShorthand(task)).toBe(expected)
  })

  it("should format a task with only required fields", () => {
    const task: Task = {
      id: "1",
      title: "Simple Task",
      completed: false,
      subtasks: [],
      createdAt: now,
      updatedAt: now
    }

    expect(taskToShorthand(task)).toBe("Simple Task")
  })

  it("should format a task with some optional fields", () => {
    const task: Task = {
      id: "1",
      title: "Task with Tags",
      tags: ["Work", "Important"],
      durationMinutes: 30,
      completed: false,
      subtasks: [],
      createdAt: now,
      updatedAt: now
    }

    const expected = `Task with Tags
#Work
#Important
30m`

    expect(taskToShorthand(task)).toBe(expected)
  })

  it("should handle empty arrays", () => {
    const task: Task = {
      id: "1",
      title: "Task with Empty Arrays",
      subtasks: [],
      tags: [],
      completed: false,
      createdAt: now,
      updatedAt: now
    }

    expect(taskToShorthand(task)).toBe("Task with Empty Arrays")
  })

  it("should handle undefined optional fields", () => {
    const task: Task = {
      id: "1",
      title: "Task with Undefined Fields",
      subtasks: [],
      completed: false,
      createdAt: now,
      updatedAt: now
    }

    expect(taskToShorthand(task)).toBe("Task with Undefined Fields")
  })

  it("should format a task with urgency", () => {
    const task: Task = {
      id: "1",
      title: "Urgent Task",
      urgency: "immediate",
      completed: false,
      subtasks: [],
      createdAt: now,
      updatedAt: now
    }

    expect(taskToShorthand(task)).toBe("Urgent Task\n! (Immediate)")
  })

  it("should format a task with importance", () => {
    const task: Task = {
      id: "1",
      title: "Important Task",
      importance: "critical",
      completed: false,
      subtasks: [],
      createdAt: now,
      updatedAt: now
    }

    expect(taskToShorthand(task)).toBe("Important Task\n**** (Critical)")
  })

  it("should format a task with both urgency and importance", () => {
    const task: Task = {
      id: "1",
      title: "Critical and Immediate Task",
      urgency: "immediate",
      importance: "valuable",
      completed: false,
      subtasks: [],
      createdAt: now,
      updatedAt: now
    }

    expect(taskToShorthand(task)).toBe("Critical and Immediate Task\n!!!!\n**")
  })

  it("should format all urgency levels correctly", () => {
    const urgencyLevels: NonNullable<Task["urgency"]>[] = ["immediate", "soon", "later", "someday"]
    
    urgencyLevels.forEach(urgency => {
      const task: Task = {
        id: "1",
        title: "Task",
        urgency,
        completed: false,
        subtasks: [],
        createdAt: now,
        updatedAt: now
      }

      const capitalizedUrgency = urgency.charAt(0).toUpperCase() + urgency.slice(1)
      expect(taskToShorthand(task)).toBe(`Task\n! (${capitalizedUrgency})`)
    })
  })

  it("should format all importance levels correctly", () => {
    const importanceLevels: [NonNullable<Task["importance"]>, string][] = [
      ["critical", "****"],
      ["significant", "***"],
      ["valuable", "**"],
      ["optional", "*"]
    ]
    
    importanceLevels.forEach(([importance, stars]) => {
      const task: Task = {
        id: "1",
        title: "Task",
        importance,
        completed: false,
        subtasks: [],
        createdAt: now,
        updatedAt: now
      }

      const capitalizedImportance = importance.charAt(0).toUpperCase() + importance.slice(1)
      expect(taskToShorthand(task)).toBe(`Task\n${stars} (${capitalizedImportance})`)
    })
  })
})
