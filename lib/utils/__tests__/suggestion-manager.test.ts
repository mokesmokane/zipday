import { getSuggestions, SuggestionManager } from "../suggestion-manager"
import { EntryStage } from "../entry-stage-manager"

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
      const result = await getSuggestions("som", "som", "title", mockSuggestionManager, testOptions)
      expect(result).toEqual(["suggestion 1", "suggestion 2", "something else"])
    })

    it("handles subtask prefix correctly", async () => {
      const result = await getSuggestions("Title\n- som", "- som", "subtask", mockSuggestionManager, testOptions)
      expect(result).toEqual(["suggestion 1", "suggestion 2", "something else"])
    })
  })

  describe("category suggestions", () => {
    it("returns all categories when input is empty", async () => {
      const result = await getSuggestions("", "", "category", mockSuggestionManager, testOptions)
      expect(result).toEqual(["work", "personal", "health"])
    })

    it("returns all categories when only # is typed", async () => {
      const result = await getSuggestions("Title\n#", "#", "category", mockSuggestionManager, testOptions)
      expect(result).toEqual(["work", "personal", "health"])
    })

    it("filters categories based on input after #", async () => {
      const result = await getSuggestions("Title\n#per", "#per", "category", mockSuggestionManager, testOptions)
      expect(result).toEqual(["personal"])
    })

    it("is case insensitive", async () => {
      const result = await getSuggestions("Title\n#WORK", "#WORK", "category", mockSuggestionManager, testOptions)
      expect(result).toEqual(["work"])
    })
  })

  describe("duration suggestions", () => {
    it("returns all durations when input is empty", async () => {
      const result = await getSuggestions("Buy groceries\n#personal", "", "duration", mockSuggestionManager, testOptions)
      expect(result).toEqual(["30m", "1h", "2h"])
    })

    it("filters durations based on input", async () => {
      const result = await getSuggestions("Buy groceries\n#personal", "1", "duration", mockSuggestionManager, testOptions)
      expect(result).toEqual(["1h"])
    })

    it("handles no matches", async () => {
      const result = await getSuggestions("Buy groceries\n#personal", "5h", "duration", mockSuggestionManager, testOptions)
      expect(result).toEqual([])
    })
  })

  describe("time suggestions", () => {
    it("returns all times when input is empty", async () => {
      const result = await getSuggestions("Buy groceries\n#personal\n30m", "", "time", mockSuggestionManager, testOptions)
      expect(result).toEqual(["9:00", "10:00", "14:00"])
    })

    it("returns all times when only @ is typed", async () => {
      const result = await getSuggestions("Buy groceries\n#personal\n30m", "@", "time", mockSuggestionManager, testOptions)
      expect(result).toEqual(["9:00", "10:00", "14:00"])
    })

    it("filters times based on input after @", async () => {
      const result = await getSuggestions("Buy groceries\n#personal\n30m", "@9", "time", mockSuggestionManager, testOptions)
      expect(result).toEqual(["9:00"])
    })

    it("filters times with hour prefix", async () => {
      const result = await getSuggestions("Buy groceries\n#personal\n30m", "@1", "time", mockSuggestionManager, testOptions)
      expect(result).toEqual(["10:00", "14:00"])
    })
  })

  describe("edge cases", () => {
    it("handles unknown entry stage", async () => {
      const result = await getSuggestions("Title\n- subtask\n#category\n@9:30-11:00\n1h30m", "test", "description" as EntryStage, mockSuggestionManager, testOptions)
      expect(result).toEqual([])
    })

    it("handles undefined options by using defaults", async () => {
      const result = await getSuggestions("Title\n- subtask\n#category\n@9:30-11:00\n1h30m", "", "category", mockSuggestionManager, {})
      expect(result.length).toBeGreaterThan(0)
    })

    it("trims whitespace from input", async () => {
      const result = await getSuggestions("Title\n- subtask\n", "  #work  ", "category", mockSuggestionManager, testOptions)
      expect(result).toEqual(["work"])
    })
  })
}) 