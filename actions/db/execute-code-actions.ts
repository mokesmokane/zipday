"use server"

import { createContext, runInContext } from "vm"
import * as taskActions from "@/actions/db/tasks-actions"
import { cookies } from "next/headers"
import { adminAuth } from "@/lib/firebaseAdmin"
import { ActionState } from "@/types/server-action-types"
import { Task } from "@/types/daily-task-types"
interface CodeExecutionResult {
  result: string
  outputs: string[]
}

async function getAuthenticatedUserId(): Promise<string> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session")?.value
  if (!sessionCookie) {
    throw new Error("No session cookie found")
  }
  const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie)
  return decodedClaims.uid
}

export async function executeCodeAction(code: string): Promise<ActionState<CodeExecutionResult>> {
  console.log("Starting executeCodeAction with code:", code)
  try { 
    if (!code) {
      console.log("No code provided, returning early")
      return {
        isSuccess: false,
        message: "No code provided"
      }
    }

    // Get the authenticated user ID
    console.log("Attempting to get authenticated user ID")
    const userId = await getAuthenticatedUserId()
    console.log("Authenticated userId:", userId)

    // Store console.log outputs
    let outputs: string[] = []

    console.log("Creating sandbox context")
    // Create a sandbox context with our custom functions
    const sandboxContext = createContext({
      console: {
        log: (...args: any[]) => {
          console.log("Sandbox console.log:", ...args)
          outputs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(" "))
        }
      },
      // Add task actions with proper error handling and userId
      getIncompleteTasks: async (startDate: string, endDate: string) => {
        console.log("Calling getIncompleteTasks:", { startDate, endDate })
        const result = await taskActions.getIncompleteTasksAction(startDate, endDate)
        console.log("getIncompleteTasks result:", result)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      getDaysByDateRange: async (startDate: string, endDate: string) => {
        const result = await taskActions.getDaysByDateRangeAction(startDate, endDate)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      getBacklogTasks: async () => {
        const result = await taskActions.getBacklogTasksAction()
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      checkWithUser: async (message: string) => {
        // Simulate user confirmation for now
        return true
      },
      getToday: async () => {
        const result = await taskActions.getTodayAction()
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      markTaskCompleted: async (taskId: string) => {
        const result = await taskActions.markTaskCompletedAction(taskId)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      markTasksCompleted: async (dateIds: Record<string, string[]>) => {
        const result = await taskActions.markTasksCompletedAction(dateIds)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      markSubtaskCompleted: async (taskId: string, subtaskId: string) => {
        const result = await taskActions.markSubtaskCompletedAction(taskId, subtaskId)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      addTask: async (date: string, task: Task, insertIndex?: number) => {
        const result = await taskActions.addTasksAction(date, [task], insertIndex)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      updateTask: async (date: string, taskId: string, updates: Partial<Task>) => {
        const result = await taskActions.updateTaskAction(date, taskId, updates)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      createTask: async (date: string, task: Task) => {
        const result = await taskActions.addTasksAction(date, [task])
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      deleteTask: async (date: string, taskId: string) => {
        const result = await taskActions.deleteTaskAction(date, taskId)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      // Additional functions
      moveTask: async (taskId: string, newDate: string, newStartTime?: string, newEndTime?: string) => {
        const result = await taskActions.moveTaskAction(taskId, newDate, newStartTime, newEndTime)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      
      scheduleBacklogTask: async (taskId: string, date: string, startTime?: string, endTime?: string) => {
        const result = await taskActions.scheduleBacklogTaskAction(taskId, date, startTime, endTime)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      
      reorderDayTasks: async (dateDoc: string, taskIds: string[]) => {
        const result = await taskActions.reorderDayTasksAction(dateDoc, taskIds)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      
      addBacklogTask: async (task: Task, insertIndex?: number) => {
        const result = await taskActions.addBacklogTaskAction(task, insertIndex)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      
      updateBacklogTask: async (taskId: string, updates: Partial<Task>) => {
        const result = await taskActions.updateBacklogTaskAction(taskId, updates)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      
      deleteBacklogTask: async (taskId: string) => {
        const result = await taskActions.deleteBacklogTaskAction(taskId)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      },
      
      reorderBacklogTasks: async (taskIds: string[]) => {
        const result = await taskActions.reorderBacklogTasksAction(taskIds)
        if (!result.isSuccess) throw new Error(result.message)
        return result.data
      }
    })

    // Execute the code and capture the result
    let result
    try {
      console.log("Preparing to execute code in sandbox")
      const wrappedCode = `(async () => { 
        try {
          return await (async function() {
            ${code}
          })();
        } catch (error) {
          console.log("Error:", error.message);
          throw error;
        }
      })();`
      console.log("Wrapped code:", wrappedCode)

      result = await runInContext(wrappedCode, sandboxContext, {
        timeout: 5000,
        displayErrors: true
      })
      console.log("Code execution result:", result)
    } catch (error: any) {
      console.error("Runtime execution error:", error)
      return {
        isSuccess: false,
        message: `Runtime Error: ${error.message}`,
      }
    }

    // Format the result for display
    console.log("Formatting result for display")
    const formattedResult = typeof result === 'object' 
      ? JSON.stringify(result, null, 2)
      : String(result)
    console.log("Formatted result:", formattedResult)
    console.log("Collected outputs:", outputs)

    return {
      isSuccess: true,
      message: "Code executed successfully",
      data: {
        result: formattedResult,
        outputs
      }
    }
  } catch (error: any) {
    console.error("Server Action Error:", error)
    return {
      isSuccess: false,
      message: `Server Error: ${error.message}`
    }
  }
} 