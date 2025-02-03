import { TodoResult } from "@/types/response-types"
import { DecideResponse } from "@/types/response-types"
import { OpenAI } from "openai"
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionTool } from "openai/resources/chat/completions"

const client = new OpenAI()

//function def for check results
const markResultsFunctionDef: ChatCompletionTool = 
{
  type: "function",
  function: {
      name: "decide",
      description: "Decide the next phase of the workflow",
      parameters: {
      type: "object",
      properties: { 
        phase: { type: "enum", 
          enum: ["gather", "build_plan", "execute"]
        } 
      },
      required: ["phase"],
      additionalProperties: false
    }
  }
}

// Build system prompt for gathering stage
function buildDecideSystemPrompt(todo_list: string[], context: string, plan: string[], results?: string): string {
  let prompt = `
  You are an assistant that decides the next phase of the workflow.

  You have been given a todo list that needs to be completed:
  ${todo_list.map(item => `- ${item}`).join("\n")}

  You have been given a context:
  ${context}

  You have been given a plan:
  ${plan.map(item => `- ${item}`).join("\n")}

  You have been given a results:
  ${results}

  Decide the next phase of the workflow.
  gather: if you need to gather more information
  build_plan: if you need to build a plan
  execute: if you need to execute the plan
  `

  return prompt
}

export async function POST(req: Request) {
  try {
    console.log("Decide endpoint called")
    const x = await req.json()
    console.log("Request:", x)
    const { context, todo_list, plan, results } = x

    if (!context || !todo_list || !plan) {
      return Response.json({
        decision: undefined,
        success: false,
        message: "Missing required fields"
      } as DecideResponse, { status: 400 })
    }

    const request = {
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: buildDecideSystemPrompt(todo_list, context, plan, results)
        },
        {
          role: "user",
          content: "Please decide the next phase of the workflow."
        }
      ], 
      tool_choice: "required",
      tools: [markResultsFunctionDef] as ChatCompletionTool[],
    }

    const completion = await client.chat.completions.create(request as ChatCompletionCreateParamsNonStreaming)

    const toolCall = completion.choices[0].message.tool_calls?.[0]
    if (!toolCall) {
      return Response.json({
        decision: undefined,
        success: false,
        message: "No phase decision was made"
      } as DecideResponse, { status: 400 })
    }

    const parsedResults = JSON.parse(toolCall.function.arguments) as { phase: string }  
    
    return Response.json({
      decision: parsedResults.phase,
      success: true,
      message: "Phase decision made successfully"
    } as DecideResponse)

  } catch (error) {
    console.error("Error in decide endpoint:", error)
    return Response.json({
      decision: undefined,
      success: false,
      message: error instanceof Error ? error.message : "Failed to process request"
    } as DecideResponse, { status: 500 })
  }
} 