"use server"

import {
  FunctionCall,
  FunctionCallName,
  MarkTaskCompletedArgs,
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
  createBacklogTask,
  moveTask,
  markTaskCompleted,
  markSubtaskCompleted
} from "@/actions/db/tasks-actions"
import { getCalendarForDateRange } from "@/actions/db/calendar-actions"
import { addUserNotes } from "@/actions/db/user-actions"
import { setCallback } from "@/actions/db/callback-actions"
import { updatePlan } from "@/actions/db/plan-actions"

// Create a Map to store processing queues
const processingQueue = new Map<string, Promise<any>>()

// Process a function call
export async function processCall(
  functionCallName: FunctionCallName,
  args: FunctionCallArgs
): Promise<any> {
  // Generate a unique ID for this function call
  const callId = `${functionCallName}-${Date.now()}`

  // Create a promise for this function call
  const processingPromise = executeCall(functionCallName, args)

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
    throw error
  }
}

// Execute a function call
async function executeCall(
  name: FunctionCallName,
  args: FunctionCallArgs
): Promise<any> {
  try {
    switch (name as FunctionCallName) {
      case "create_task":
        return await createTask(args as CreateTaskArgs)

      case "create_backlog_task":
        return await createBacklogTask(args as CreateBacklogTaskArgs)

      case "move_task":
        return await moveTask(args as MoveTaskArgs)

      case "mark_task_completed":
        return await markTaskCompleted(args as MarkTaskCompletedArgs)

      case "mark_subtask_completed":
        return await markSubtaskCompleted(args as MarkSubtaskCompletedArgs)

      case "get_calendar_for_date_range":
        return await getCalendarForDateRange(
          args as GetCalendarForDateRangeArgs
        )

      case "set_callback":
        return await setCallback(args as SetCallbackArgs)

      case "add_user_notes":
        return await addUserNotes(args as AddUserNotesArgs)

      case "updatePlan":
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
