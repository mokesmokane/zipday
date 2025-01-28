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

export type FunctionCallArgs = UpdatePlanArgs | HangUpArgs | SuggestActionsArgs

export type FunctionCallName = 'updatePlan' | 'suggestActions'

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

  constructor(name: string, args: FunctionCallArgs) {
    this.name = name
    this.args = args
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
    suggestActions: {
      type: "function",
      name: "suggest_actions",
      description: "Use this to suggest actions to the user",
      parameters: {
        type: "object",
        properties: {
          action_list: {
            type: "enum",
            description: "List of actions to be completed",
            enum: ["review_backlog", "summarise_day", "suggest_priorities"]
          }
        }
      }
    },
    // hangUp: {
    //   type: "function",
    //   name: "hang_up",
    //   description: "Use this to end the call when the conversation has reached a natural conclusion or all necessary information has been gathered.",
    //   parameters: {
    //       type: "object",
    //       properties: {
    //         reason: {
    //           type: "string",
    //           description: "Brief explanation of why the call is being ended"
    //         }
    //       },
    //       required: ["reason"]
    //     }
    //   }
    }

  createFunctionCall(name: "updatePlan", args: UpdatePlanArgs): FunctionCall
//   createFunctionCall(name: "hangUp", args: HangUpArgs): FunctionCall
  createFunctionCall(name: FunctionCallName, args: FunctionCallArgs): FunctionCall {
    return new FunctionCall(name, args)
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