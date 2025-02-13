import { Task } from "@/types/daily-task-types"
import { EntryStage } from "./entry-stage-manager"

export interface SuggestionOptions {
  categoryOptions?: string[]
  durationOptions?: string[]
  timeOptions?: string[]
}

const DEFAULT_OPTIONS: SuggestionOptions = {
  categoryOptions: ['work', 'personal', 'health', 'errands', 'meeting'],
  durationOptions: ['30m', '1h', '1h30m', '2h', '3h', '4h'],
  timeOptions: ['9:00', '10:00', '11:00', '14:00', '15:00']
}

interface GetAISuggestionsParams {
  currentTask: string | null
  contextTasks: Task[]
  completionType: EntryStage
  currentText: string
}

export interface SuggestionManager {
  getAISuggestions: (params: GetAISuggestionsParams) => Promise<string[]>
}

export async function getSuggestions(
  currentTask: string,
  currentText: string,
  entryStage: EntryStage,
  suggestionManager: SuggestionManager,
  options: SuggestionOptions = DEFAULT_OPTIONS
): Promise<string[]> {
  // Get the current line text without any prefixes
  const textWithoutPrefix = currentText
    .trim()
    .replace(/^-\s*/, '') // Remove subtask prefix
    .replace(/^#\s*/, '') // Remove category prefix
    .replace(/^@\s*/, '') // Remove time prefix
    .toLowerCase() // Case insensitive matching

  switch (entryStage) {
    case 'title':
    case 'subtask': {
      const completions = await suggestionManager.getAISuggestions({
        currentTask: currentTask,
        contextTasks: [],
        completionType: entryStage,
        currentText
      })
      return completions
    }

    case 'category': {
      const categories = options.categoryOptions || DEFAULT_OPTIONS.categoryOptions!
      return textWithoutPrefix
        ? categories.filter(cat => 
            cat.toLowerCase().startsWith(textWithoutPrefix)
          )
        : categories
    }

    case 'duration': {
      const durations = options.durationOptions || DEFAULT_OPTIONS.durationOptions!
      return textWithoutPrefix
        ? durations.filter(duration => 
            duration.toLowerCase().startsWith(textWithoutPrefix)
          )
        : durations
    }

    case 'time': {
      const times = options.timeOptions || DEFAULT_OPTIONS.timeOptions!
      return textWithoutPrefix
        ? times.filter(time => time.startsWith(textWithoutPrefix))
        : times
    }

    default:
      return []
  }
} 