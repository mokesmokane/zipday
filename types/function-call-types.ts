import { Task } from "./daily-task-types"

export interface UpdatePlanArgs {
  todo_list: string[]
}

export interface HangUpArgs {
  reason: string
}

export enum SuggestActions {
  REVIEW_BACKLOG = "review_backlog",
  SUMMARISE_DAY = "summarise_day",
  SUGGEST_PRIORITIES = "suggest_priorities"
}

export interface SuggestActionsArgs {
  action_list: SuggestActions[]
}

export interface AddUserNotesArgs {
  explicit_instructions: string[]
  interaction_notes: string[]
}

export interface CreateTaskArgs {
  title: string
  description?: string
  date: string
  start_time?: string
  subtasks?: string[]
  duration_minutes?: number
  urgency?: string
  importance?: string
}

export interface SetCallbackArgs {
  callback_datetime: string
  context: string
}

export interface MoveTaskArgs {
  task_id: string
  new_date: string
  new_start_time?: string
  new_end_time?: string
}

export function createMoveTaskArgs(args: MoveTaskArgs, idMappings: Record<string, string>): MoveTaskArgs {
  return {
    ...args,
    task_id: idMappings[args.task_id]
  }
}

export interface MarkTasksCompletedArgs {
  task_ids: string[]
}

export function createMarkTasksCompletedArgs(args: MarkTasksCompletedArgs, idMappings: Record<string, string>): MarkTasksCompletedArgs {
  return {
    ...args,
    task_ids: args.task_ids.map(id => idMappings[id])
  }
}

export interface MarkSubtaskCompletedArgs {
  task_id: string
  subtask_id: string
}

export function createMarkSubtaskCompletedArgs(args: MarkSubtaskCompletedArgs, idMappings: Record<string, string>): MarkSubtaskCompletedArgs {
  return {
    ...args,
    task_id: idMappings[args.task_id],
    subtask_id: idMappings[args.subtask_id]
  }
}


export interface GetCalendarForDateRangeArgs {
  start_date: string
  end_date: string
}

export interface CreateBacklogTaskArgs {
  title: string
  description?: string
  subtasks?: string[]
  duration_minutes?: string
  urgency?: string
  importance?: string
}

export interface ScheduleBacklogTaskArgs {
  task_id: string
  date: string
  start_time?: string
  end_time?: string
}

export interface ExecuteCodeArgs {
  code: string
}

export type FunctionCallArgs =
  | UpdatePlanArgs
  | HangUpArgs
  | SuggestActionsArgs
  | AddUserNotesArgs
  | CreateTaskArgs
  | SetCallbackArgs
  | MoveTaskArgs
  | ExecuteCodeArgs
  | ScheduleBacklogTaskArgs
  | MarkTasksCompletedArgs
  | MarkSubtaskCompletedArgs
  | GetCalendarForDateRangeArgs
  | CreateBacklogTaskArgs

export type FunctionCallName =
  | "update_plan"
  | "add_user_notes"
  | "move_task"
  | "create_task"
  | "schedule_backlog_task"
  | "mark_tasks_completed"
  | "mark_subtask_completed"
  | "get_calendar_for_date_range"
  | "set_callback"
  | "create_backlog_task"
  | "get_backlog_tasks"
  | "get_incomplete_tasks"
  | "get_future_tasks"
  | "execute_code"

export interface FunctionCallDefinition {
  type: "function"
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, any>
    required?: string[]
    additionalProperties: boolean
  }
}

export interface FunctionCallUIMetadata {
  id: FunctionCallName
  label: string
  icon: string
  description: string
  category: "file" | "task" | "calendar" | "system"
  planMode: boolean
}

export const FUNCTION_CALL_UI_METADATA: FunctionCallUIMetadata[] = [
  {
    id: "update_plan",
    label: "Update Plan",
    icon: "📝",
    description: "Update the plan with new tasks",
    category: "task",
    planMode: true
  },
  {
    id: "create_task",
    label: "Create Task",
    icon: "✨",
    description: "Create a new task",
    category: "task",
    planMode: false
  },
  {
    id: "create_backlog_task",
    label: "Create Backlog Task",
    icon: "📥",
    description: "Add task to backlog",
    category: "task",
    planMode: false
  },
  {
    id: "move_task",
    label: "Move Task",
    icon: "🔄",
    description: "Reschedule a task",
    category: "task",
    planMode: false
  },
  {
    id: "schedule_backlog_task",
    label: "Schedule Backlog Task",
    icon: "🔄",
    description: "Schedule a backlog task",
    category: "task",
    planMode: false
  },
  {
    id: "mark_tasks_completed",
    label: "Complete Tasks",
    icon: "✅",
    description: "Mark tasks as done",
    category: "task",
    planMode: false
  },
  {
    id: "mark_subtask_completed",
    label: "Complete Subtask",
    icon: "☑️",
    description: "Mark subtask as done",
    category: "task",
    planMode: false
  },
  {
    id: "get_calendar_for_date_range",
    label: "Get Calendar",
    icon: "📅",
    description: "View calendar range",
    category: "calendar",
    planMode: false
  },
  {
    id: "set_callback",
    label: "Set Callback",
    icon: "⏰",
    description: "Schedule a reminder",
    category: "calendar",
    planMode: false
  },
  {
    id: "add_user_notes",
    label: "Add Notes",
    icon: "📌",
    description: "Store user preferences",
    category: "system",
    planMode: true
  },
  {
    id: "get_backlog_tasks",
    label: "Get Backlog Tasks",
    icon: "📥",
    description: "Get all tasks from the backlog",
    category: "task",
    planMode: false
  },
  {
    id: "get_incomplete_tasks",
    label: "Get Incomplete Tasks",
    icon: "📥",
    description: "Get all incomplete tasks",
    category: "task",
    planMode: false
  },
  {
    id: "get_future_tasks",
    label: "Get Future Tasks",
    icon: "📥",
    description: "Get all tasks scheduled for the future",
    category: "task",
    planMode: false
  },
  {
    id: "execute_code",
    label: "Execute Code",
    icon: "💻",
    description: "Execute code in typescript",
    category: "system",
    planMode: false
  }
]

export function getFunctionCallMetadata(name: FunctionCallName): FunctionCallUIMetadata {
  const metadata = FUNCTION_CALL_UI_METADATA.find(m => m.id === name)
  if (!metadata) {
    throw new Error(`No UI metadata found for function: ${name}`)
  }
  return metadata
}

export function getFunctionCallsByCategory(isPlanMode: boolean): Record<string, FunctionCallUIMetadata[]> {
  const filteredMetadata = FUNCTION_CALL_UI_METADATA.filter(m => m.planMode === isPlanMode)
  return filteredMetadata.reduce((acc, metadata) => {
    if (!acc[metadata.category]) {
      acc[metadata.category] = []
    }
    acc[metadata.category].push(metadata)
    return acc
  }, {} as Record<string, FunctionCallUIMetadata[]>)
}

export type FunctionCall = {
  name: string
  args: FunctionCallArgs
  executeImmediately: boolean
}

export class ActionCall implements FunctionCall {
  name: string
  args: FunctionCallArgs
  executeImmediately: boolean = true
  constructor(
    name: string,
    args: FunctionCallArgs,
    executeImmediately: boolean = false
  ) {
    this.name = name
    this.args = args
    this.executeImmediately = executeImmediately
  }
}

export class QueryCall implements FunctionCall {
  name: string
  args: FunctionCallArgs
  executeImmediately: boolean = false
  constructor(name: string, args: FunctionCallArgs) {
    this.name = name
    this.args = args
  }
}

export type FunctionCallRegistry = Record<
  FunctionCallName,
  FunctionCallDefinition
>

export class FunctionCallFactory {
  private readonly _functionCallDefinitions: FunctionCallRegistry = {
    update_plan: {
      type: "function",
      name: "update_plan",
      description:
        "Use this to note down things that need to be completed after the call. you can call this multiple times if you need to update the plan but it must contain all the things you need to do after the call. it overwrites the previous plan",
      parameters: {
        type: "object",
        properties: {
          todo_list: {
            type: "array",
            description:
              "List of things that need to be completed - these are actions you are going to do after the call",
            items: {
              type: "string",
              description: "Description of the action to be completed"
            }
          }
        },
        required: ["todo_list"],
        additionalProperties: false
      }
    },
    create_task: {
      type: "function",
      name: "create_task",
      description: "Creates a new task in the user's to-do list or calendar",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title of the task"
          },
          description: {
            type: ["string", "null"],
            description: "Optional details or notes about the task"
          },
          date: {
            type: "string",
            description: "Date of the task in YYYY-MM-DD format"
          },
          start_time: {
            type: ["string", "null"],
            description: "Start time of the task in HH:MM format"
          },
          subtasks: {
            type: ["array", "null"],
            description: "List of subtasks associated with this task",
            items: {
              type: "string"
            }
          },
          duration_minutes: {
            type: ["number", "null"],
            description: "Duration of the task in minutes"
          },
          urgency: {
            type: ["string", "null"],
            enum: ["immediate", "soon", "later", "someday"],
            description: "Urgency level"
          },
          importance: {
            type: ["string", "null"],
            enum: ["critical", "significant", "valuable", "optional"],
            description: "Importance level"
          }
        },
        required: ["title", "date", "description", "start_time", "subtasks", "duration_minutes", "urgency", "importance"],
        additionalProperties: false
      }
    },
    create_backlog_task: {
      type: "function",
      name: "create_backlog_task",
      description: "Creates a new task in the user's to-do list or calendar",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title of the task"
          },
          description: {
            type: ["string", "null"],
            description: "Optional details or notes about the task"
          },
          subtasks: {
            type: "array",
            description: "List of subtasks associated with this task",
            items: {
              type: "string"
            }
          },
          duration_minutes: {
            type: ["string", "null"],
            description: "Duration of the task in minutes in the format '1h30m'"
          },
          urgency: {
            type: ["string", "null"],
            enum: ["immediate", "soon", "later", "someday"],
            description: "Urgency level"
          },
          importance: {
            type: ["string", "null"],
            enum: ["critical", "significant", "valuable", "optional"],
            description: "Importance level"
          }
        },
        required: ["title", "description", "subtasks", "duration_minutes", "urgency", "importance"],
        additionalProperties: false
      }
    },
    schedule_backlog_task: {
      type: "function",
      name: "schedule_backlog_task",
      description: "Move a task from the backlog to a specific date",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description: "Unique identifier or reference for the task"
          },
          date: {
            type: "string",
            description: "Date of the task in YYYY-MM-DD format"
          },
          start_time: {
            type: ["string", "null"],
            description: "Start time of the task in HH:MM format"
          },
          end_time: {
            type: ["string", "null"],
            description: "End time of the task in HH:MM format"
          }
        },
        required: ["task_id", "date", "start_time", "end_time"],
        additionalProperties: false
      }
    },
    move_task: {
      type: "function",
      name: "move_task",
      description: "Moves or reschedules an existing task on the calendar",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description: "Unique identifier or reference for the task"
          },
          new_date: {
            type: "string",
            description: "New date for the task in YYYY-MM-DD format"
          },
          new_start_time: {
            type: ["string", "null"],
            description: "New start time in HH:MM (24-hour) format"
          },
          new_end_time: {
            type: ["string", "null"],
            description: "New end time in HH:MM (24-hour) format"
          }
        },
        required: ["task_id", "new_date", "new_start_time", "new_end_time"],
        additionalProperties: false
      }
    },

    mark_tasks_completed: {
      type: "function",
      name: "mark_tasks_completed",
      description: "Marks a specified task (and all its subtasks) as completed",
      parameters: {
        type: "object",
        properties: {
          task_ids: {
            type: "array",
            description: "List of task IDs to mark as completed",
            items: {
              type: "string",
              description: "Unique identifier or reference for the task"
            }
          }
        },
        required: ["task_ids"],
        additionalProperties: false
      }
    },

    mark_subtask_completed: {
      type: "function",
      name: "mark_subtask_completed",
      description:
        "Marks a specific subtask as completed within a given parent task",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description: "Unique identifier or reference for the parent task"
          },
          subtask_id: {
            type: "string",
            description: "Unique identifier or reference for the subtask"
          }
        },
        required: ["task_id", "subtask_id"],
        additionalProperties: false
      }
    },
    get_backlog_tasks: {
      type: "function",
      name: "get_backlog_tasks",
      description: "Retrieves all tasks from the backlog",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    },
    get_incomplete_tasks: {
      type: "function",
      name: "get_incomplete_tasks",
      description: "Retrieves all incomplete tasks within a default date range",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    },
    get_future_tasks: {
      type: "function",
      name: "get_future_tasks",
      description: "Retrieves all tasks scheduled for the future within a default date range",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    },
    get_calendar_for_date_range: {
      type: "function",
      name: "get_calendar_for_date_range",
      description:
        "Retrieves tasks and events within a specified date range from the calendar",
      parameters: {
        type: "object",
        properties: {
          start_date: {
            type: "string",
            description: "Start date in YYYY-MM-DD format"
          },
          end_date: {
            type: "string",
            description: "End date in YYYY-MM-DD format"
          }
        },
        required: ["start_date", "end_date"],
        additionalProperties: false
      }
    },
    set_callback: {
      type: "function",
      name: "set_callback",
      description:
        "Schedules a callback time for future interaction or reminders",
      parameters: {
        type: "object",
        properties: {
          callback_datetime: {
            type: "string",
            description:
              "Date and time for the callback in ISO 8601 format (e.g. '2025-01-15T14:30:00')"
          },
          context: {
            type: "string",
            description:
              "A note or reference describing the purpose of the callback"
          }
        },
        required: ["callback_datetime", "context"],
        additionalProperties: false
      }
    },
    add_user_notes: {
      type: "function",
      name: "add_user_notes",
      description: "Store user instructions or relevant notes about how to interact best with the user. This data is for the AI's private reference, not for external display.",
      parameters: {
        type: "object",
        properties: {
          explicit_instructions: {
            type: ["array", "null"],
            description: "Any explicit general instructions the user provides (e.g., preferences on how to be addressed, topics to avoid, etc.)",
            items: {
              type: "string"
            }
          },
          interaction_notes: {
            type: ["array", "null"],
            description: "Additional observations or strategies for best interacting with the user, e.g. communication style, motivational tips, etc.",
            items: {
              type: "string"
            }
          }
        },
        required: ["explicit_instructions", "interaction_notes"],
        additionalProperties: false
      }
    },
    execute_code: {
      type: "function",
      name: "execute_code",
      description: "Executes code in typescript",
      parameters: {
        type: "object",
        properties: {
          pseudo_code_plan: { type: "string", description: "Plan thoughtfully in pseudocode with a clear plan of action and comments" },
          code: { type: "string", description: "The code to execute" }
        },
        required: ["pseudo_code_plan", "code"],
        additionalProperties: false
      }
    }
  }

  createFunctionCall(
    name: FunctionCallName,
    args: FunctionCallArgs,
    idMappings: Record<string, string>,
    immediateExecution: boolean
  ): FunctionCall {
    // Handle ID mapping based on function name
    switch (name) {
      case "move_task":
        return new ActionCall(name, createMoveTaskArgs(args as MoveTaskArgs, idMappings))
      case "mark_tasks_completed":
        return new ActionCall(name, createMarkTasksCompletedArgs(args as MarkTasksCompletedArgs, idMappings))
      case "mark_subtask_completed":
        return new ActionCall(name, createMarkSubtaskCompletedArgs(args as MarkSubtaskCompletedArgs, idMappings))
      default:
        return new ActionCall(name, args)
    }
  }

  getFunctionDefinition(name: FunctionCallName): FunctionCallDefinition {
    const config = this._functionCallDefinitions[name]
    if (!config) {
      throw new Error(`Unknown function definition: ${name}`)
    }
    return config
  }

  getCodeExecutionFunctionDefinitions(): FunctionCallDefinition[] {
    return Object.values(this._functionCallDefinitions).filter(fn => fn.name === "execute_code")
  }

  getAllFunctionDefinitions(): FunctionCallDefinition[] {
    return Object.values(this._functionCallDefinitions)
  }
}
