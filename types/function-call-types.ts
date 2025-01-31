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

export interface MoveTaskArgs{
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

export interface MarkTasksCompletedArgs{
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

export type FunctionCallArgs =
  | UpdatePlanArgs
  | HangUpArgs
  | SuggestActionsArgs
  | AddUserNotesArgs
  | CreateTaskArgs
  | SetCallbackArgs
  | MoveTaskArgs
  | MarkTasksCompletedArgs
  | MarkSubtaskCompletedArgs
  | GetCalendarForDateRangeArgs
  | CreateBacklogTaskArgs

export type FunctionCallName = 
  | "update_plan" 
  | "add_user_notes" 
  | "move_task" 
  | "create_task"
  | "mark_tasks_completed"
  | "mark_subtask_completed"
  | "get_calendar_for_date_range"
  | "set_callback"
  | "create_backlog_task"

export interface FunctionCallDefinition {
  type: "function"
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, any>
    required?: string[]
  }
}

export class FunctionCall {
  name: string
  args: FunctionCallArgs
  executeImmediately: boolean
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
        required: ["todo_list"]
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
            type: "string",
            description: "Optional details or notes about the task"
          },
          date: {
            type: "string",
            description: "Date of the task in YYYY-MM-DD format"
          },
          start_time: {
            type: "string",
            description: "Start time of the task in HH:MM format"
          },
          subtasks: {
            type: "array",
            description: "List of subtasks associated with this task",
            items: {
              type: "string"
            }
          },
          duration_minutes: {
            type: "number",
            description: "Duration of the task in minutes"
          },

          urgency: {
            type: "string",
            enum: ["immediate", "soon", "later", "someday"],
            description: "Urgency level"
          },
          importance: {
            type: "string",
            enum: ["critical", "significant", "valuable", "optional"],
            description: "Importance level"
          }
        },
        required: ["title", "date"]
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
            type: "string",
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
            type: "string",
            description: "Duration of the task in minutes in the format '1h30m'"
          },

          urgency: {
            type: "string",
            enum: ["immediate", "soon", "later", "someday"],
            description: "Urgency level"
          },
          importance: {
            type: "string",
            enum: ["critical", "significant", "valuable", "optional"],
            description: "Importance level"
          }
        },
        required: ["title"]
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
            type: "string",
            description: "New start time in HH:MM (24-hour) format"
          },
          new_end_time: {
            type: "string",
            description: "New end time in HH:MM (24-hour) format"
          }
        },
        required: ["task_id", "new_date", "new_start_time", "new_end_time"]
      }
    },

    mark_tasks_completed: {
      type: "function", 
      name: "mark_tasks_completed",
      description: "Marks a specified task as completed",
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
        required: ["task_ids"]
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
        required: ["task_id", "subtask_id"]
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
        required: ["start_date", "end_date"]
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
        required: ["callback_datetime", "context"]
      }
    },
    add_user_notes: {
      type: "function",
      name: "add_user_notes",
      description:
        "Store user instructions or relevant notes about how to interact best with the user. This data is for the AI's private reference, not for external display.",
      parameters: {
        type: "object",
        properties: {
          explicit_instructions: {
            type: "string",
            description:
              "Any explicit general instructions the user provides (e.g., preferences on how to be addressed, topics to avoid, etc.)"
          },
          interaction_notes: {
            type: "string",
            description:
              "Additional observations or strategies for best interacting with the user, e.g. communication style, motivational tips, etc."
          }
        },
        required: []
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
        return new FunctionCall(name, createMoveTaskArgs(args as MoveTaskArgs, idMappings), immediateExecution)
      case "mark_tasks_completed":
        return new FunctionCall(name, createMarkTasksCompletedArgs(args as MarkTasksCompletedArgs, idMappings), immediateExecution)
      case "mark_subtask_completed":
        return new FunctionCall(name, createMarkSubtaskCompletedArgs(args as MarkSubtaskCompletedArgs, idMappings), immediateExecution)
      default:
        return new FunctionCall(name, args, immediateExecution)
    }
  }

  getFunctionDefinition(name: FunctionCallName): FunctionCallDefinition {
    const config = this._functionCallDefinitions[name]
    if (!config) {
      throw new Error(`Unknown function definition: ${name}`)
    }
    return config
  }

  getAllFunctionDefinitions(): FunctionCallDefinition[] {
    return Object.values(this._functionCallDefinitions)
  }
}
