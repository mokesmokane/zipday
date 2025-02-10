import { CoreMessage, streamText, CoreTool } from "ai"
import { openai } from "@ai-sdk/openai"
import { FunctionCallDefinition } from "@/types/function-call-types"
import { getAllFunctionDefinitions } from "@/lib/function-calls"

interface TaskChatRequest {
  messages: CoreMessage[]
  tasks?: string[]
  functionDefinitions?: FunctionCallDefinition[]
  context?: string
  stage?: "gather" | "execute"
  queryResults?: Record<string, any>
}

// Convert FunctionCallDefinition to CoreTool format
function convertToCoreTool(fn: FunctionCallDefinition): CoreTool {
  return {
    type: "function",
    parameters: fn.parameters,
    description: fn.description
  }
}

// Filter function definitions based on stage
function getStageTools(functionDefs: FunctionCallDefinition[], stage: "gather" | "execute"): FunctionCallDefinition[] {
  // Information gathering tools
  const gatherTools = ["get_calendar_for_date_range", "get_backlog_tasks", "get_incomplete_tasks", "get_future_tasks"]
  
  // Task execution tools
  const executeTools = [
    "create_task",
    "move_task",
    "mark_tasks_completed",
    "mark_subtask_completed",
    "create_backlog_task",
    "schedule_backlog_task"
  ]

  return functionDefs.filter(fn => 
    stage === "gather" ? gatherTools.includes(fn.name) : executeTools.includes(fn.name)
  )
}

export async function POST(req: Request) {
  const { messages, tasks, functionDefinitions, context, stage = "gather", queryResults }: TaskChatRequest = await req.json()
  
  // Get default function definitions if none provided
  const allFunctionDefs = functionDefinitions || getAllFunctionDefinitions()
  
  // Filter tools based on stage
  const stageFunctionDefs = getStageTools(allFunctionDefs, stage)
  
  // Convert to Record<string, CoreTool>
  const tools = stageFunctionDefs.reduce((acc, fn) => ({
    ...acc,
    [fn.name]: convertToCoreTool(fn)
  }), {} as Record<string, CoreTool>)

  // Build system prompt based on stage
  let systemPrompt = stage === "gather" 
    ? `You are an information gathering assistant. Your role is to gather all necessary information before executing tasks.

IMPORTANT INSTRUCTIONS:
1. You have been given a list of tasks that need to be completed
2. Your first job is to gather ALL necessary information using the available query functions
3. Use get_calendar_for_date_range to check relevant dates for these tasks
4. Make ALL necessary information gathering calls immediately
5. Explain briefly what information you're gathering and why
6. You will receive the results of these queries in the next stage`

    : `You are a task execution assistant. Now that you have gathered the necessary information, your role is to execute the tasks.

IMPORTANT INSTRUCTIONS:
1. You have been provided with the results of your information gathering queries: ${JSON.stringify(queryResults, null, 2)}
2. Using this information, you MUST now use the available functions to complete ALL the tasks
3. For each task, determine which function(s) would best accomplish it based on the gathered information
4. Make ALL necessary function calls immediately - do not wait for user confirmation
5. If a task requires multiple function calls, make them all in sequence
6. Explain briefly what you're doing as you execute the functions
7. If you cannot complete a task with the available functions, explain why`

  if (tasks?.length) {
    systemPrompt += "\n\nTasks to complete:\n" + tasks.map(task => 
      `- ${task}`
    ).join("\n")
  }
  if (context) {
    systemPrompt += "\n\nAdditional Context:\n" + context
  }

  // Stream the response with function calling enabled
  const result = streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages,
    tools,
    toolChoice: Object.keys(tools).length ? "auto" : undefined
  })

  return result.toDataStreamResponse()
} 