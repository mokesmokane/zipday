import { parseDuration, parseMetadata, parseTaskInput } from "../task-parser"

describe("parseDuration", () => {
  test("parses hours", () => {
    expect(parseDuration("1h")).toBe(60)
    expect(parseDuration("2h")).toBe(120)
    expect(parseDuration("1.5h")).toBe(90)
    expect(parseDuration("2hours")).toBe(120)
    expect(parseDuration("1 hour")).toBe(60)
  })

  test("parses minutes", () => {
    expect(parseDuration("30m")).toBe(30)
    expect(parseDuration("45m")).toBe(45)
    expect(parseDuration("90m")).toBe(90)
    expect(parseDuration("30minutes")).toBe(30)
    expect(parseDuration("45 min")).toBe(45)
  })

  test("parses combined format", () => {
    expect(parseDuration("1h30m")).toBe(90)
    expect(parseDuration("2h 15m")).toBe(135)
  })

  test("returns undefined for invalid formats", () => {
    expect(parseDuration("invalid")).toBeUndefined()
    expect(parseDuration("h30m")).toBeUndefined()
    expect(parseDuration("30")).toBeUndefined()
  })
})

describe("parseMetadata", () => {
  test("parses importance", () => {
    expect(parseMetadata("!")).toEqual({
      importance: undefined,
      urgency: "someday",
      durationMinutes: undefined
    })
    expect(parseMetadata("!!")).toEqual({
      importance: undefined,
      urgency: "later",
      durationMinutes: undefined
    })
    expect(parseMetadata("!!!")).toEqual({
      importance: undefined,
      urgency: "soon",
      durationMinutes: undefined
    })
    expect(parseMetadata("!!!!")).toEqual({
      importance: undefined,
      urgency: "immediate",
      durationMinutes: undefined
    })
  })

  test("parses urgency", () => {
    expect(parseMetadata("*")).toEqual({
      importance: "optional",
      urgency: undefined,
      durationMinutes: undefined
    })
    expect(parseMetadata("**")).toEqual({
      importance: "valuable",
      urgency: undefined,
      durationMinutes: undefined
    })
    expect(parseMetadata("***")).toEqual({
      importance: "significant",
      urgency: undefined,
      durationMinutes: undefined
    })
    expect(parseMetadata("****")).toEqual({
      importance: "critical",
      urgency: undefined,
      durationMinutes: undefined
    })
  })

  test("parses duration", () => {
    expect(parseMetadata("1h")).toEqual({
      importance: undefined,
      urgency: undefined,
      durationMinutes: 60
    })
    expect(parseMetadata("30m")).toEqual({
      importance: undefined,
      urgency: undefined,
      durationMinutes: 30
    })
  })

  test("returns undefined for invalid metadata", () => {
    expect(parseMetadata("invalid")).toBeUndefined()
    expect(parseMetadata("!!!!!")).toBeUndefined() // More than 4 !
    expect(parseMetadata("*****")).toBeUndefined() // More than 4 *
  })

  test("parses combined importance and urgency on same line", () => {
    expect(parseMetadata("!!**")).toEqual({
      importance: "valuable",
      urgency: "later",
      durationMinutes: undefined
    })
    expect(parseMetadata("**!!")).toEqual({
      importance: "valuable",
      urgency: "later",
      durationMinutes: undefined
    })
    expect(parseMetadata("!***")).toEqual({
      importance: "significant",
      urgency: "someday",
      durationMinutes: undefined
    })
    expect(parseMetadata("****!")).toEqual({
      importance: "critical",
      urgency: "someday",
      durationMinutes: undefined
    })
  })

  test("ignores invalid combined markers", () => {
    expect(parseMetadata("!!!!!**")).toBeUndefined() // Too many !
    expect(parseMetadata("!!*****")).toBeUndefined() // Too many *
    expect(parseMetadata("!!!!****")).toEqual({
      importance: "critical",
      urgency: "immediate",
      durationMinutes: undefined
    }) // Max of each
  })
})

describe("parseTaskInput", () => {
  test("parses basic task", () => {
    const input = "Buy groceries"
    const result = parseTaskInput(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      title: "Buy groceries",
      importance: undefined,
      urgency: undefined
    })
  })

  test("parses task with metadata in title", () => {
    const input = "!!** Buy groceries"
    const result = parseTaskInput(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      title: "Buy groceries",
      importance: "valuable",
      urgency: "later"
    })
  })

  test("parses task with metadata on separate line", () => {
    const input = `Buy groceries
!!!
**
1h30m`
    const result = parseTaskInput(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      title: "Buy groceries",
      importance: "valuable",
      urgency: "soon",
      durationMinutes: 90
    })
  })

  test("parses task with subtasks", () => {
    const input = `Buy groceries
- Milk
- Eggs
- Bread`
    const result = parseTaskInput(input)
    expect(result).toHaveLength(1)
    expect(result[0].subtasks).toHaveLength(3)
    expect(result[0].subtasks[0]).toMatchObject({
      text: "Milk",
      completed: false
    })
  })

  test("parses task with tags", () => {
    const input = `Buy groceries
#shopping
#errands`
    const result = parseTaskInput(input)
    expect(result).toHaveLength(1)
    expect(result[0].tags).toEqual(["shopping", "errands"])
  })

  test("parses task with calendar time", () => {
    const input = `Buy groceries
@14:30`
    const result = parseTaskInput(input)
    expect(result).toHaveLength(1)
    expect(result[0].calendarItem).toBeDefined()
    if (result[0].calendarItem && result[0].calendarItem.start.dateTime) {
      const date = new Date(result[0].calendarItem.start.dateTime)
      expect(date.getHours()).toBe(14)
      expect(date.getMinutes()).toBe(30)
    }
  })

  test("parses multiple tasks", () => {
    const input = `!!Buy groceries
1h

***Do laundry
30m`
    const result = parseTaskInput(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      title: "Buy groceries",
      importance: undefined,
      urgency: "later",
      durationMinutes: 60
    })
    expect(result[1]).toMatchObject({
      title: "Do laundry",
      importance: "significant",
      urgency: undefined,
      durationMinutes: 30
    })
  })

  test("parses task with combined metadata on separate line", () => {
    const input = `Buy groceries
!!**
1h30m`
    const result = parseTaskInput(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      title: "Buy groceries",
      importance: "valuable",
      urgency: "later",
      durationMinutes: 90
    })
  })

  test("parses task with mixed metadata formats", () => {
    const input = `Buy groceries
!!**
***
!!!!
1h30m`
    const result = parseTaskInput(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      title: "Buy groceries",
      importance: "significant",
      urgency: "immediate",
      durationMinutes: 90
    })
  })

  test("ignores empty lines with special characters", () => {
    const input = `Buy groceries
#
@
-
  #  
  @  
  -  
#    #
@    @
-    -`
    const result = parseTaskInput(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      title: "Buy groceries",
      tags: [],
      subtasks: [],
      calendarItem: undefined
    })
  })

  test("only parses valid tags, subtasks and times", () => {
    const input = `Buy groceries
#validtag
#
- valid subtask
-
@14:30
@
#  tag with content  
-  subtask with content  
@  14:45  `
    const result = parseTaskInput(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      title: "Buy groceries",
      tags: ["validtag", "tag with content"],
      subtasks: [
        { text: "valid subtask", completed: false },
        { text: "subtask with content", completed: false }
      ]
    })
    if (result[0].calendarItem && result[0].calendarItem.start.dateTime) {
      const date = new Date(result[0].calendarItem.start.dateTime)
      expect(date.getHours()).toBe(14)
      expect(date.getMinutes()).toBe(45)
    }
  })
})
