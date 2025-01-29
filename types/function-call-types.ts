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
  due_date?: string
  due_time?: string
  subtasks?: string[]
  priority?: string
}

export interface SetCallbackArgs {
  callback_datetime: string
  context: string
}

export interface MoveTaskArgs {
  task_id: string
  new_date: string
  new_start_time: string
  new_end_time: string
}

export interface MarkTaskCompletedArgs {
  task_id: string
}

export interface MarkSubtaskCompletedArgs {
  task_id: string
  subtask_id: string
}

export interface GetCalendarForDateRangeArgs {
  start_date: string
  end_date: string
}


export type FunctionCallArgs = UpdatePlanArgs | HangUpArgs | SuggestActionsArgs | AddUserNotesArgs | CreateTaskArgs | SetCallbackArgs | MoveTaskArgs | MarkTaskCompletedArgs | MarkSubtaskCompletedArgs | GetCalendarForDateRangeArgs 

export type FunctionCallName = 'updatePlan' | 'create_task' | 'move_task' | 'mark_task_completed' | 'mark_subtask_completed' | 'get_calendar_for_date_range' | 'set_callback' | 'add_user_notes'

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
  idMappings: Record<string, string>

  constructor(name: string, args: FunctionCallArgs, idMappings: Record<string, string>,  executeImmediately: boolean = false) {
    this.name = name
    this.args = args
    this.idMappings = idMappings
    this.executeImmediately = executeImmediately
  }
}


export type FunctionCallRegistry = Record<FunctionCallName, FunctionCallDefinition>

export class FunctionCallFactory {
  private readonly _functionCallDefinitions: FunctionCallRegistry = {
    updatePlan: {
      type: "function",
      name: "update_plan",
      description: "Use this to note down things that need to be completed after the call. you can call this multiple times if you need to update the plan but it must contain all the things you need to do after the call. it overwrites the previous plan",
      parameters: {
          type: "object",
          properties: {
            todo_list: {
              type: "array",
              description: "List of things that need to be completed - these are actions you are going to do after the call",
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
          due_date: {
            type: "string",
            description: "Due date for the task in YYYY-MM-DD format (optional)"
          },
          due_time: {
            type: "string",
            description: "Due time for the task in HH:MM (24-hour) format (optional)"
          },
          subtasks: {
            type: "array",
            description: "List of subtasks associated with this task",
            items: {
              type: "string"
            }
          },
          priority: {
            type: "string",
            description: "Priority level, e.g. 'low', 'medium', 'high' (optional)"
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
            "description": "Unique identifier or reference for the task"
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
  
    mark_task_completed: {
      type: "function",
      name: "mark_task_completed",
      description: "Marks a specified task as completed",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description: "Unique identifier or reference for the task"
          }
        },
        required: ["task_id"]
      }
    },

    mark_subtask_completed: {
      type: "function",
      name: "mark_subtask_completed",
      description: "Marks a specific subtask as completed within a given parent task",
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
      description: "Retrieves tasks and events within a specified date range from the calendar",
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
      description: "Schedules a callback time for future interaction or reminders",
      parameters: {
        type: "object",
        properties: {
          callback_datetime: {
            type: "string",
            description: "Date and time for the callback in ISO 8601 format (e.g. '2025-01-15T14:30:00')"
          },
          context: {
            type: "string",
            description: "A note or reference describing the purpose of the callback"
          }
        },
        required: ["callback_datetime", "context"]
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
            type: "string",
            description: "Any explicit general instructions the user provides (e.g., preferences on how to be addressed, topics to avoid, etc.)"
          },
          interaction_notes: {
            type: "string",
            description: "Additional observations or strategies for best interacting with the user, e.g. communication style, motivational tips, etc."
          }
        },
        required: []
      }
    }
  }

  createFunctionCall(name: "updatePlan", args: UpdatePlanArgs, idMappings: Record<string, string>): FunctionCall
  createFunctionCall(name: "create_task", args: CreateTaskArgs, idMappings: Record<string, string>): FunctionCall
  createFunctionCall(name: "move_task", args: MoveTaskArgs, idMappings: Record<string, string>): FunctionCall
  createFunctionCall(name: "mark_task_completed", args: MarkTaskCompletedArgs, idMappings: Record<string, string>): FunctionCall
  createFunctionCall(name: "mark_subtask_completed", args: MarkSubtaskCompletedArgs, idMappings: Record<string, string>): FunctionCall
  createFunctionCall(name: "get_calendar_for_date_range", args: GetCalendarForDateRangeArgs, idMappings: Record<string, string>): FunctionCall
  createFunctionCall(name: "set_callback", args: SetCallbackArgs, idMappings: Record<string, string>): FunctionCall
  createFunctionCall(name: "add_user_notes", args: AddUserNotesArgs, idMappings: Record<string, string>): FunctionCall

  createFunctionCall(name: FunctionCallName, args: FunctionCallArgs, idMappings: Record<string, string>): FunctionCall {
    return new FunctionCall(name, args, idMappings)
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