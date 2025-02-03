import { CoreMessage, streamText, CoreTool } from "ai"
import { openai } from "@ai-sdk/openai"
import { FunctionCallDefinition } from "@/types/function-call-types"
import { getAllFunctionDefinitions } from "@/lib/function-calls"
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionTool } from "openai/resources/chat/completions.mjs"
import { OpenAI } from "openai"

const client = new OpenAI()
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

interface ExecuteRequest {
  todo_list: string[]
  queryResults: Record<string, any>
  context?: string
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
  const executeTools = getExecuteTools(allFunctionDefs).map(fn => convertToTool(fn))


  const request = {
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: buildExecuteSystemPrompt(todo_list, queryResults, context)
      },
      {
        role: "user",
        content: "Please execute all items in the plan using the gathered information."
      }
    ],
    tools: executeTools as ChatCompletionTool[],
    tool_choice: "required"
  }

  const completion = await client.chat.completions.create(request as ChatCompletionCreateParamsNonStreaming)
  // Call AI to execute tasks
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