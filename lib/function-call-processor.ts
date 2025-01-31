"use server"

import {
  FunctionCall,
  FunctionCallName,
  MarkTasksCompletedArgs,
  MarkSubtaskCompletedArgs,
  MoveTaskArgs,
  GetCalendarForDateRangeArgs,
  SetCallbackArgs,
  CreateTaskArgs,
  AddUserNotesArgs,
  UpdatePlanArgs,
  CreateBacklogTaskArgs,
  FunctionCallArgs
} from "@/types/function-call-types"
import {
  createTask,
  addBacklogTaskAction,
  markTasksCompletedAction
} from "@/actions/db/tasks-actions"
import { getCalendarForDateRange } from "@/actions/db/calendar-actions"
import { addUserNotes } from "@/actions/db/user-actions"
import { setCallback } from "@/actions/db/callback-actions"
import { updatePlan } from "@/actions/db/plan-actions"
// Create a Map to store processing queues
const processingQueue = new Map<string, Promise<any>>()

// Process a function call
export async function processCall<T extends FunctionCallArgs>(
  functionCallName: string,
  args: T
): Promise<any> {

  // Generate a unique ID for this function call
  const callId = `${functionCallName}-${Date.now()}`

  // Create a promise for this function call
  const processingPromise = executeCall(functionCallName as FunctionCallName, args)

  // Add to queue
  processingQueue.set(callId, processingPromise)

  try {
    // Wait for execution
    const result = await processingPromise

    // Remove from queue when done
    processingQueue.delete(callId)

    return result
  } catch (error) {
    // Remove from queue on error
    processingQueue.delete(callId)
    console.error("Error processing call:", error)
    throw error
  }
}

// Execute a function call
async function executeCall(
  name: FunctionCallName,
  args: FunctionCallArgs
): Promise<any> {
  try {
    console.log("Executing function call:", name)
    console.log("Arguments:", args)
    console.log("typeof args", typeof args)
    switch (name as FunctionCallName) {
      case "create_task":
        return await createTask(args as CreateTaskArgs)

      case "create_backlog_task":
        return

      case "move_task":
        return

      case "mark_tasks_completed":
        return 
        
      case "mark_subtask_completed":
        return

      case "get_calendar_for_date_range":
        return await getCalendarForDateRange(
          args as GetCalendarForDateRangeArgs
        )

      case "set_callback":
        return await setCallback(args as SetCallbackArgs)

      case "add_user_notes":
        return await addUserNotes(args as AddUserNotesArgs)

      case "update_plan":
        return await updatePlan(args as UpdatePlanArgs)

      default:
        throw new Error(`Unknown function call: ${name}`)
    }
  } catch (error) {
    console.error(`Error executing function call ${name}:`, error)
    throw error
  }
}

// Get queue status
export async function getQueueStatus(): Promise<{
  queueLength: number
  activeProcesses: string[]
}> {
  return {
    queueLength: processingQueue.size,
    activeProcesses: Array.from(processingQueue.keys())
  }
}

// Clear queue
export async function clearQueue(): Promise<void> {
  processingQueue.clear()
}

// Check if a call is processing
export async function isProcessing(callId: string): Promise<boolean> {
  return processingQueue.has(callId)
}
