import { CoreMessage, streamText, CoreTool } from "ai"
import { openai } from "@ai-sdk/openai"
import { FunctionCallDefinition } from "@/types/function-call-types"
import { getAllFunctionDefinitions } from "@/lib/function-calls"

interface ExecutePlanRequest {
  todo_list: string[]
  context?: string
}

interface ToolCall {
  type: string
  name: string
  response: any
}

interface StreamChunk {
  type: string
  toolCalls?: ToolCall[]
}

interface FunctionCallResult {
  name: string
  response: any
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

// Build system prompt for execution stage
function buildExecuteSystemPrompt(todo_list: string[], queryResults: Record<string, any>, context?: string): string {
  let prompt = `You are a task execution assistant. Your role is to execute the plan using the gathered information.

IMPORTANT INSTRUCTIONS:
1. You have been provided with the results of your information gathering queries: ${JSON.stringify(queryResults, null, 2)}
2. Using this information, you MUST now use the available functions to complete ALL items in the todo list:
${todo_list.map(item => `- ${item}`).join("\n")}

3. For each item, determine which function(s) would best accomplish it based on the gathered information
4. Make ALL necessary function calls immediately - do not wait for user confirmation
5. If an item requires multiple function calls, make them all in sequence
6. Explain briefly what you're doing as you execute the functions
7. If you cannot complete an item with the available functions, explain why`

  if (context) {
    prompt += "\n\nAdditional Context:\n" + context
  }

  return prompt
}

// Convert Uint8Array to string
function uint8ArrayToString(array: Uint8Array): string {
  return new TextDecoder().decode(array)
}

export async function POST(req: Request) {
  const { todo_list, context }: ExecutePlanRequest = await req.json()
  
  // First stage: Information Gathering
  const allFunctionDefs = getAllFunctionDefinitions()
  const gatherTools = getStageTools(allFunctionDefs, "gather").reduce((acc, fn) => ({
    ...acc,
    [fn.name]: convertToCoreTool(fn)
  }), {} as Record<string, CoreTool>)

  // First call to gather information
  const gatherResult = await streamText({
    model: openai("gpt-4o"),
    system: buildGatherSystemPrompt(todo_list, context),
    messages: [{ role: "user", content: "Please gather all necessary information to execute this plan." }],
    tools: gatherTools,
    toolChoice: Object.keys(gatherTools).length ? "auto" : undefined
  })

  // Get the response as a stream
  const stream = gatherResult.toDataStream()
  const reader = stream.getReader()
  const functionCalls: FunctionCallResult[] = []

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      try {
        const chunk = JSON.parse(uint8ArrayToString(value)) as StreamChunk
        if (chunk.type === 'tool-calls' && chunk.toolCalls) {
          functionCalls.push(...chunk.toolCalls.map(call => ({
            name: call.name,
            response: call.response
          })))
        }
      } catch (e) {
        // Skip non-JSON chunks
        continue
      }
    }
  } finally {
    reader.releaseLock()
  }

  // Convert function calls to query results
  const queryResults = functionCalls.reduce((acc: Record<string, any>, call: FunctionCallResult) => ({
    ...acc,
    [call.name]: call.response
  }), {})

  // Second stage: Task Execution
  const executeTools = getStageTools(allFunctionDefs, "execute").reduce((acc, fn) => ({
    ...acc,
    [fn.name]: convertToCoreTool(fn)
  }), {} as Record<string, CoreTool>)

  // Second call to execute tasks
  const executeResult = streamText({
    model: openai("gpt-4o"),
    system: buildExecuteSystemPrompt(todo_list, queryResults, context),
    messages: [{ role: "user", content: "Please execute all items in the plan using the gathered information." }],
    tools: executeTools,
    toolChoice: Object.keys(executeTools).length ? "auto" : undefined
  })

  return executeResult.toDataStreamResponse()
} 