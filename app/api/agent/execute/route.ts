import { CoreMessage, streamText, CoreTool } from "ai"
import { openai } from "@ai-sdk/openai"
import { FunctionCallDefinition } from "@/types/function-call-types"
import { getAllFunctionDefinitions } from "@/lib/function-calls"

interface ExecuteRequest {
  todo_list: string[]
  queryResults: Record<string, any>
  context?: string
}

// Convert FunctionCallDefinition to CoreTool format
function convertToCoreTool(fn: FunctionCallDefinition): CoreTool {
  return {
    type: "function",
    parameters: fn.parameters,
    description: fn.description
  }
}

// Get task execution tools
function getExecuteTools(functionDefs: FunctionCallDefinition[]): FunctionCallDefinition[] {
  const executeTools = [
    "create_task",
    "move_task",
    "mark_tasks_completed",
    "mark_subtask_completed",
    "create_backlog_task"
  ]
  
  return functionDefs.filter(fn => executeTools.includes(fn.name))
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

export async function POST(req: Request) {
  const { todo_list, queryResults, context }: ExecuteRequest = await req.json()
  
  // Get tools for task execution
  const allFunctionDefs = getAllFunctionDefinitions()
  const executeTools = getExecuteTools(allFunctionDefs).reduce((acc, fn) => ({
    ...acc,
    [fn.name]: convertToCoreTool(fn)
  }), {} as Record<string, CoreTool>)

  // Call AI to execute tasks
  const result = streamText({
    model: openai("gpt-4o"),
    system: buildExecuteSystemPrompt(todo_list, queryResults, context),
    messages: [{ role: "user", content: "Please execute all items in the plan using the gathered information." }],
    tools: executeTools,
    toolChoice: Object.keys(executeTools).length ? "auto" : undefined
  })

  return result.toDataStreamResponse()
} 