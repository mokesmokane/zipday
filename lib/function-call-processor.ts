"use server"

import { FunctionCall, FunctionCallName, MarkTaskCompletedArgs, MarkSubtaskCompletedArgs, MoveTaskArgs, GetCalendarForDateRangeArgs, SetCallbackArgs, CreateTaskArgs, AddUserNotesArgs, UpdatePlanArgs } from "@/types/function-call-types"
import { createTask, moveTask, markTaskCompleted, markSubtaskCompleted } from "@/actions/db/tasks-actions"
import { getCalendarForDateRange } from "@/actions/db/calendar-actions"
import { addUserNotes } from "@/actions/db/user-actions"
import { setCallback } from "@/actions/db/callback-actions"
import { updatePlan } from "@/actions/db/plan-actions"

export class FunctionCallProcessor {
  private static instance: FunctionCallProcessor
  private processingQueue: Map<string, Promise<any>>

  private constructor() {
    this.processingQueue = new Map()
  }

  public static getInstance(): FunctionCallProcessor {
    if (!FunctionCallProcessor.instance) {
      FunctionCallProcessor.instance = new FunctionCallProcessor()
    }
    return FunctionCallProcessor.instance
  }

  public async processCall(functionCall: FunctionCall): Promise<any> {
    // Generate a unique ID for this function call
    const callId = `${functionCall.name}-${Date.now()}`

    // Create a promise for this function call
    const processingPromise = this.executeCall(functionCall)

    // Add to queue
    this.processingQueue.set(callId, processingPromise)

    try {
      // Wait for execution
      const result = await processingPromise
      
      // Remove from queue when done
      this.processingQueue.delete(callId)
      
      return result
    } catch (error) {
      // Remove from queue on error
      this.processingQueue.delete(callId)
      throw error
    }
  }

  private async executeCall(functionCall: FunctionCall): Promise<any> {
    const { name, args, idMappings } = functionCall

    try {
      switch (name as FunctionCallName) {
        case "create_task":
          return await createTask(args as CreateTaskArgs)

        case "move_task":
          return await moveTask(args as MoveTaskArgs)

        case "mark_task_completed":
          return await markTaskCompleted(args as MarkTaskCompletedArgs)

        case "mark_subtask_completed":
          return await markSubtaskCompleted(args as MarkSubtaskCompletedArgs)

        case "get_calendar_for_date_range":
          return await getCalendarForDateRange(args as GetCalendarForDateRangeArgs)

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

  public getQueueStatus(): { queueLength: number; activeProcesses: string[] } {
    return {
      queueLength: this.processingQueue.size,
      activeProcesses: Array.from(this.processingQueue.keys())
    }
  }
}

// Export a singleton instance
export const functionCallProcessor = FunctionCallProcessor.getInstance() 