export type EntryStage = 'title' | 'subtask' | 'category' | 'time' | 'duration' | 'description'

export function determineNextEntryStage(input: string): EntryStage {
  if (!input.trim()) return 'title'

  const lines = input.split('\n')
  const lastLine = lines[lines.length - 1]

  // If we have two consecutive blank lines at the end, start a new task
  if (
    lines.length >= 2 &&
    !lines[lines.length - 1].trim() &&
    !lines[lines.length - 2].trim()
  ) {
    return 'title'
  }

  // Find the last non-empty line to determine where we are in the task
  let lastNonEmptyLineIndex = lines.length - 1
  while (lastNonEmptyLineIndex >= 0 && !lines[lastNonEmptyLineIndex].trim()) {
    lastNonEmptyLineIndex--
  }

  // If all lines are empty or no lines, start with title
  if (lastNonEmptyLineIndex < 0) return 'title'

  const lastNonEmptyLine = lines[lastNonEmptyLineIndex]

  // If the last non-empty line is a duration (e.g., "1h" or "30m"), start a new task
  if (lastNonEmptyLine.match(/^\d+[hm]$/)) return 'title'

  // If we're in the middle of subtasks
  if (lastNonEmptyLine.startsWith('- ')) {
    // If it's just a dash, move to category
    if (lastNonEmptyLine.trim() === '-') return 'category'
    // Otherwise continue with subtasks
    return 'subtask'
  }

  // If we just entered a category
  if (lastNonEmptyLine.startsWith('#')) return 'time'

  // If we just entered a time
  if (lastNonEmptyLine.startsWith('@')) return 'duration'

  // If we're in description mode
  if (lastNonEmptyLine.startsWith('> ')) {
    // If it's just an arrow, start a new task
    if (lastNonEmptyLine.trim() === '>') return 'title'
    // Otherwise continue with description
    return 'description'
  }

  // If we have a non-empty line that doesn't match any special prefix,
  // it's a title and we should move to subtasks
  return 'subtask'
}

/**
 * Processes an enter key press in the task input field.
 * Takes the current complete input string and returns what it should look like after pressing enter.
 */
export function processEnterKey(input: string): string {
    console.log('input:\n', input)
    let result = input
    //if last char is not a new line, return the input
    if (input[input.length - 1] !== '\n') return input

    const lines = input.split('\n')
    const lastLine = lines[lines.length - 1]
    const previousLine = lines[lines.length - 2]
    const previousLine2 = lines[lines.length - 3]
    const otherLines = lines.slice(0, -2)

    // First condition: If previous line is a subtask (has dash with content)
    if (previousLine.match(/^\s*-\s+\S/)) {
        console.log('previousLine is a title')
        result = result + '- '
    }

    // Second condition: If previous line is just a dash (no content)
    if (previousLine.match(/^\s*-\s*$/)) {
        console.log('previousLine is just a dash')
        result = [...otherLines, '#'].join('\n')
    }

    // If the line before starts with # and has no content, next line should be @
    if (previousLine.match(/^\s*#\s*$/)) {
        console.log('previousLine is a category with no content')
        result = [...otherLines, '@'].join('\n')
    }

    // If the line before starts with # and has content (category), next line should be @
    if (previousLine.match(/^\s*#\s*\S+/)) {
        console.log('previousLine is a category with content')
        result = [...otherLines, previousLine, '@'].join('\n')
    }

    // If the line before starts with @ and has no content, next line should be 1h
    if (previousLine.match(/^\s*@\s*$/)) {
        console.log('previousLine is a time with no content')
        result = [...otherLines, '1h'].join('\n')
    }

    //if the line before starts with '@', ' @ ' or ' @' and has some non whitespace characters the last line should now be "1h "
    if (previousLine.match(/^\s*@\s*\S+/)) {
        console.log('previousLine is a time with content')
        result = [...otherLines, previousLine, '1h'].join('\n')
    }

    //if the line before starts with alphanumeric characters the last line should now be " - "
    if (previousLine.match(/^[a-zA-Z0-9]/) && (lines.length === 2 || previousLine2.trim() === '')) {
        console.log('previousLine is a subtask')
        result = [...otherLines, previousLine, '- '].join('\n')
    }

    console.log('result:\n', result)
    return result

}

/**
 * Determines the current entry stage based on the input text
 * This looks at what the user is currently typing/editing
 */
export function getCurrentEntryStage(input: string): EntryStage {
  if (!input.trim()) return 'title'

  // Get the last section (split by double newlines)
  const sections = input.split('\n\n')
  const currentSection = sections[sections.length - 1]
  const lines = currentSection.split('\n')
  const currentLine = lines[lines.length - 1].trim()

  // Check current line prefixes
  if (currentLine.trim().startsWith('-')) return 'subtask'
  if (currentLine.trim().startsWith('#')) return 'category'
  if (currentLine.trim().startsWith('@')) return 'time'
  if (currentLine.trim().match(/^\d+[hm]$/)) return 'duration'

  // Find if there's a previous plain text line in this section
  const hasEarlierPlainLine = lines.slice(0, -1).some(line => {
    const trimmed = line.trim()
    return trimmed && 
           !trimmed.startsWith('- ') && 
           !trimmed.startsWith('#') && 
           !trimmed.startsWith('@') && 
           !trimmed.match(/^\d+[hm]$/)
  })

  return hasEarlierPlainLine ? 'description' : 'title'
} 