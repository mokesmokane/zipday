import { TodoResult } from "@/types/response-types"
import { OpenAI } from "openai"
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionTool } from "openai/resources/chat/completions"
import { CheckResultsResponse } from "@/types/response-types"

const client = new OpenAI()

//function def for check results
const markResultsFunctionDef: ChatCompletionTool = 
{
  type: "function",
  function: {
      name: "mark_results",
      description: "Mark the results of the execution",
      parameters: {
      type: "object",
      properties: { 
        todo_list: { type: "array", 
          items: { type: "object",
            properties: {
              task: { type: "string" },
              reason: { type: "string" },
              result: { type: "boolean" }
            },
            additionalProperties: false,
            required: ["task", "reason", "result"]
          } 
        }
      },
      additionalProperties: false
    }
  }
}

// Build system prompt for gathering stage
function buildMarkResultsSystemPrompt(todo_list: string[], results?: string): string {
  let prompt = `You are an assistant that marks the results of the execution. 

IMPORTANT INSTRUCTIONS:
1. You have been given a todo list that needs to be maked as done or not done based on the results of the execution.
List Items:
${todo_list.map(item => `- ${item}`).join("\n")}

Results:
${results}

Consider whether the result of the execution is successful has completed the tasks or not and mark the todo list accordingly by using the mark_results function.
`

  return prompt
}

export async function POST(req: Request) {
  const { todo_list, results }: { todo_list: string[], results: string } = await req.json()

  const request = {
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: buildMarkResultsSystemPrompt(todo_list, results)
      },
      {
        role: "user",
        content: "Please mark the results of the execution."
      }
    ], 
    tool_choice: "required",
    tools: [markResultsFunctionDef] as ChatCompletionTool[],
  }

  console.log("request:", request)
  // Call OpenAI API directly for information gathering
  
  const completion = await client.chat.completions.create(request as ChatCompletionCreateParamsNonStreaming)

  console.log("completion:", completion)
  for (const choice of completion.choices) {
    console.log("choice:", choice)
    console.log("choice.message.content:", choice.message.content)
    console.log("choice.message.tool_calls:", choice.message.tool_calls)
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        console.log("toolCall:", toolCall)
        console.log("toolCall.function.arguments:", toolCall.function.arguments)
      }
    }
  }

  try {
    const toolCall = completion.choices[0].message.tool_calls?.[0]
    if (!toolCall) {
      return Response.json({
        results: [],
        success: false,
        message: "No results were processed"
      } as CheckResultsResponse, { status: 400 })
    }

    const parsedResults = JSON.parse(toolCall.function.arguments) as { todo_list: TodoResult[] }
    
    return Response.json({
      results: parsedResults.todo_list,
      success: true,
      message: "Results processed successfully"
    } as CheckResultsResponse, { status: 200 })
  } catch (error) {
    return Response.json({
      results: [],
      success: false,
      message: "Failed to process results"
    } as CheckResultsResponse, { status: 500 })
  }
} 