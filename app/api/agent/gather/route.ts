import { OpenAI } from "openai"
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionTool } from "openai/resources/chat/completions"
import { FunctionCallDefinition } from "@/types/function-call-types"
import { getAllFunctionDefinitions } from "@/lib/function-calls"

const client = new OpenAI()

interface GatherRequest {
  todo_list: string[]
  context?: string
}

// Convert FunctionCallDefinition to OpenAI tool format
function convertToTool(fn: FunctionCallDefinition) {
  return {
    type: "function",
    function: {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters,
      strict: true
    }
  }
}

// Get information gathering tools
function getGatherTools(functionDefs: FunctionCallDefinition[]): FunctionCallDefinition[] {
  const gatherTools = [
    "get_calendar_for_date_range", 
    "get_backlog_tasks", 
    "get_incomplete_tasks", 
    "get_future_tasks"
  ]
  
  return functionDefs.filter(fn => gatherTools.includes(fn.name))
}

// Build system prompt for gathering stage
function buildGatherSystemPrompt(todo_list: string[], context?: string): string {
  let prompt = `You are an information gathering assistant. Your role is to gather all necessary information before executing the plan.

IMPORTANT INSTRUCTIONS:
1. You have been given a todo list that needs to be completed:
${todo_list.map(item => `- ${item}`).join("\n")}

2. Your first job is to gather ALL necessary information using the available query functions
3. Use get_calendar_for_date_range to check relevant dates
4. Use get_backlog_tasks, get_incomplete_tasks, and get_future_tasks to understand current task state
5. Make ALL necessary information gathering calls immediately
6. Explain briefly what information you're gathering and why
7. You will receive the results of these queries in the next stage`

  if (context) {
    prompt += "\n\nAdditional Context:\n" + context
  }

  return prompt
}

export async function POST(req: Request) {
  const { todo_list, context }: GatherRequest = await req.json()
  
  // Get tools for information gathering
  const allFunctionDefs = getAllFunctionDefinitions()
  const tools = getGatherTools(allFunctionDefs)
    .map(fn => convertToTool(fn))

  const request = {
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: buildGatherSystemPrompt(todo_list, context)
      },
      {
        role: "user",
        content: "Please gather all necessary information to execute this plan."
      }
    ], 
    tool_choice: tools.length ? "auto" : "none",
    tools: tools as ChatCompletionTool[],
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

  return Response.json({
    message: completion.choices[0].message
  }, { status: 200 })
} 