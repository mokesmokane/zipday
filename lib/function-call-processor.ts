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
  FunctionCallArgs,
  ScheduleBacklogTaskArgs
} from "@/types/function-call-types"
import {
  createTask,
  addBacklogTaskAction,
  markTasksCompletedAction,
  addTaskAction,
  markTaskCompletedAction,
  moveTaskAction,
  getBacklogTasksAction,
  getIncompleteTasksAction,
  getDaysByDateRangeAction,
  markSubtaskCompletedAction,
  scheduleBacklogTaskAction
} from "@/actions/db/tasks-actions"
import { executeCodeAction } from "@/actions/db/execute-code-actions"
import { getCalendarForDateRange } from "@/actions/db/calendar-actions"
import { addUserNotes } from "@/actions/db/user-actions"
import { setCallback } from "@/actions/db/callback-actions"
import { updatePlan } from "@/actions/db/plan-actions"
import { useTasks } from "./context/tasks-context"
import { Importance, Urgency } from "@/types/daily-task-types"
import { Task } from "@/types/daily-task-types"
import { ActionState } from "@/types/server-action-types"
// Process a function call
export async function processCall<T extends FunctionCallArgs>(
  functionCallName: string,
  args: T | string,
  mapping?: Record<string, string>
): Promise<any> {
  console.log("Processing function call:", functionCallName)
  console.log("Arguments:", args)
  console.log("typeof args", typeof args)

  // Generate a unique ID for this function call
  const callId = `${functionCallName}-${Date.now()}`

  console.log("callId", callId)
  // Parse args if they're a string
  const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args

  console.log("parsedArgs", parsedArgs)
  console.log("typeof parsedArgs", typeof parsedArgs)
  // Create a promise for this function call
  const processingPromise = executeCall(functionCallName, parsedArgs, mapping)

  try {
    // Wait for execution
    const result = await processingPromise

    console.log("result", result)
    return result
  } catch (error) {
    console.error("Error processing call:", error)
    throw error
  }
}

// Execute a function call
async function executeCall(
  name: string,
  args: FunctionCallArgs,
  mapping?: Record<string, string>
): Promise<ActionState<any>> {
  try {
    console.log("Executing function call:", name)
    console.log("Arguments:", args)
    console.log("typeof args", typeof args)

    // Ensure args is an object
    if (typeof args !== 'object' || args === null) {
      throw new Error(`Invalid arguments type: ${typeof args}. Expected object.`)
    }

    console.log("name", name)
    switch (name) {
      case "create_task": {
        const { title, description, date, subtasks, urgency, importance } = args as CreateTaskArgs
        const newTask: Task = {
          id: crypto.randomUUID(),
          title,
          description,
          subtasks: subtasks?.map(text => ({
            id: crypto.randomUUID(),
            text,
            completed: false
          })) || [],
          urgency: urgency as Urgency | undefined,
          importance: importance as Importance | undefined,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Optimistic update
        const result = await addTaskAction(date, newTask)
        return result
      }

      case "mark_tasks_completed": {
        const { task_ids } = args as MarkTasksCompletedArgs
        if (mapping) {
          for (const taskId of task_ids.map(id => mapping[id])) {
            markTaskCompletedAction(taskId)
          }
        } else {
          for (const taskId of task_ids) {
            markTaskCompletedAction(taskId)
          }
        }
      }
      case "mark_task_completed": {
        const { task_ids } = args as MarkTasksCompletedArgs
        if (mapping) {
          for (const taskId of task_ids.map(id => mapping[id])) {
            markTaskCompletedAction(taskId)
          }
        } else {
          for (const taskId of task_ids) {
            markTaskCompletedAction(taskId)
          } 
        }
      }

      case "move_task": {
        const { task_id, new_date, new_start_time, new_end_time } = args as MoveTaskArgs
        moveTaskAction(task_id, new_date, new_start_time, new_end_time)
      }

      case "schedule_backlog_task": {
        const { task_id, date, start_time, end_time } = args as ScheduleBacklogTaskArgs
        return await scheduleBacklogTaskAction(task_id, date, start_time, end_time)
      }

      case "create_backlog_task":
        const blArgs = (args as CreateBacklogTaskArgs)
        const newTask: Task = {
          id: crypto.randomUUID(),
          title: blArgs.title,
          description: blArgs.description,
          subtasks: blArgs.subtasks?.map(text => ({
            id: crypto.randomUUID(),
            text,
            completed: false
          })) || [],
          urgency: blArgs.urgency as Urgency | undefined,
          importance: blArgs.importance as Importance | undefined,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        return await addBacklogTaskAction(newTask)

      case "mark_subtask_completed":
        const { task_id, subtask_id } = args as MarkSubtaskCompletedArgs
        return await markSubtaskCompletedAction(task_id, subtask_id)

      case "get_calendar_for_date_range":
        const { start_date, end_date } = args as GetCalendarForDateRangeArgs
        return await getCalendarForDateRange({
          start_date,
          end_date
        })

      case "get_backlog_tasks":
        return await getBacklogTasksAction()

      case "get_incomplete_tasks": {
        // Get incomplete tasks for yesterday
        const startDate = new Date().toISOString().split('T')[0]
        const endDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        return await getIncompleteTasksAction(startDate, endDate)
      }

      case "get_future_tasks": {
        // Get tasks for next 30 days by default
        const startDate = new Date().toISOString().split('T')[0]
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        return await getDaysByDateRangeAction(startDate, endDate)
      }

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

export const executeCode = async (code: string) => {

  const result = await executeCodeAction(code)
  if (result.isSuccess) {

    console.log("success! result", result)
  }
    return result
}