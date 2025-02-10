import { CoreMessage, streamText, CoreTool } from "ai"
import { openai } from "@ai-sdk/openai"
import { FunctionCallDefinition } from "@/types/function-call-types"
import { getAllFunctionDefinitions, getCodeExecutionFunctionDefinitions } from "@/lib/function-calls"
import { OpenAI } from "openai"
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionTool } from "openai/resources/chat/completions"

const client = new OpenAI()

interface ExecuteRequest {
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

// Build system prompt for execution stage
const buildExecuteSystemPrompt =  `You are a task execution assistant. Your role is to write code in javascript to execute the plan using the gathered information.
  The user will ask you to complete a todo list.
  You should write the code that will complete the todo list.
  You can use any standard javascript functions to complete the todo list.
  You can also use the following functions to complete the todo list:

Available Functions:

User Interaction
checkWithUser(message: string): Promise<boolean>
Shows a confirmation dialog to the user and returns true if they click Continue, false if they click Cancel.

// Example usage:
const confirmed = await checkWithUser("Are you sure?");
if (confirmed) {
  // User clicked Continue
  console.log("Proceeding with action");
} else {
  // User clicked Cancel
  console.log("Action cancelled");
}

Task Retrieval
getBacklogTasks(): Promise<Task[]>
Returns an array of tasks from the backlog.

getToday(): Promise<Day>
Returns today's tasks organized in a Day object.

getDaysByDateRange(startDate: string, endDate: string): Promise<Day[]>
Returns an array of Day objects for the specified date range.

getIncompleteTasks(startDate: string, endDate: string): Promise<Record<string, Day>>
Returns incomplete tasks organized by date for the specified date range.

Task Management
createTask(args: CreateTaskArgs): Promise<void>
Creates a new task.

type CreateTaskArgs = {
  title: string
  description?: string
  date: string
  start_time?: string
  duration_minutes?: number
  subtasks?: string[]
  urgency?: "immediate" | "soon" | "later" | "someday"
  importance?: "critical" | "significant" | "valuable" | "optional"
}

addTask(dateDoc: string, task: Task, insertIndex?: number): Promise<Task>
Adds a task to a specific date and returns the added task.

updateTask(dateDoc: string, taskId: string, updates: Partial<Task>): Promise<Task>
Updates a task and returns the updated task.

deleteTask(dateDoc: string, taskId: string): Promise<void>
Deletes a task.

Task Status
markTasksCompleted(dateIds: Record<string, string[]>): Promise<void>
Marks tasks as completed. dateIds is a map of date strings to arrays of task IDs.

markSubtaskCompleted(taskId: string, subtaskId: string): Promise<void>
Marks a subtask as completed.

Task Organization
moveTask(taskId: string, newDate: string, newStartTime?: string, newEndTime?: string): Promise<void>
Moves a task to a different date/time.

scheduleBacklogTask(taskId: string, date: string, startTime?: string, endTime?: string): Promise<void>
Schedules a backlog task.

reorderDayTasks(dateDoc: string, taskIds: string[]): Promise<void>
Reorders tasks for a specific day.

Backlog Management
addBacklogTask(task: Task, insertIndex?: number): Promise<Task>
Adds a task to the backlog and returns the added task.

updateBacklogTask(taskId: string, updates: Partial<Task>): Promise<Task>
Updates a backlog task and returns the updated task.

deleteBacklogTask(taskId: string): Promise<void>
Deletes a backlog task.

reorderBacklogTasks(taskIds: string[]): Promise<void>
Reorders backlog tasks.

Tips:
All functions are asynchronous - use await with them
Use console.log() to debug values
The last evaluated expression will be returned and displayed
Execution timeout is set to 5 seconds
Functions return the actual data (not the ActionState wrapper)
Use checkWithUser() to get user confirmation before critical actions

Instructions:
1. First, provide a pseudo-code explanation of your approach.
2. Then, provide the final javascript code.
3. Enclose the final javascript code in triple backticks ( \`\`\` ) so that it can be easily extracted.
4. The code should return a list of strings representing the tasks that have been completed.

Please output both sections clearly.
the code itslef should return a list of strings which represent the list of tasks that have been completed by running this code.
`
interface CodeResponse {
  pseudoCode: string;
  code: string;
}

function parseResponse(content: string): CodeResponse {
  // Initialize default values
  let pseudoCode = "";
  let code = "";

  // Split the content by code block markers
  const parts = content.split("```");

  if (parts.length >= 3) {
    // The pseudo-code is everything before the first code block
    pseudoCode = parts[0].trim();
    
    // The actual code is inside the code block (index 1)
    // Remove javascript/ts marker if present
    code = parts[1].replace(/^(javascript|ts)\n/, "").trim();
  } else {
    // Fallback if the response isn't properly formatted
    console.warn("Response not properly formatted with code blocks");
    code = content;
  }

  return { pseudoCode, code };
}

export async function POST(req: Request) {
  const { todo_list, context }: ExecuteRequest = await req.json()
  
  console.log("MOKES todo_list", todo_list)
  console.log("MOKES context", context)
  const now = new Date().toISOString()

  const request = {
    model: "gpt-4o",
    messages: [
      { 
          role: "system", 
          content: buildExecuteSystemPrompt
      },
      {
        role: "user",
        content: `Here is the todo list: ${todo_list.map(item => `- ${item}`).join("\n")}
        Please note the date and time is: ${now}
        ${context ? `\n\nHere is some additional context to take note of:\n${context}` : ""}
        `
      }
    ],
  }
  const completion = await client.chat.completions.create(request as ChatCompletionCreateParamsNonStreaming)
  if (!completion.choices[0].message.content) {
    throw new Error("No content in completion")
  }
  const codeResponse = parseResponse(completion.choices[0].message.content)
  return Response.json(codeResponse, { status: 200 })
} 
