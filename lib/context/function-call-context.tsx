"use client"

import { createContext, useContext, useState, useRef } from "react"
import { processCall } from "@/lib/function-call-processor"
import { FunctionCall, FunctionCallName, FunctionCallArgs, CreateTaskArgs, MarkTasksCompletedArgs, MoveTaskArgs } from "@/types/function-call-types"
import { useTasks } from "./tasks-context"
import { useBacklog } from "./backlog-context"
import { Task, Day, Urgency, Importance } from "@/types/daily-task-types"

interface QueuedFunction {
  name: FunctionCallName
  args: FunctionCallArgs
  resolve: (value: any) => void
  reject: (error: any) => void
}

interface FunctionCallContextType {
  processFunction: (
    functionCall: FunctionCall
  ) => Promise<any>
  isProcessing: boolean
}

const FunctionCallContext = createContext<FunctionCallContextType | undefined>(undefined)

export function FunctionCallProvider({ children }: { children: React.ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { dailyTasks, markTasksCompleted, addTask, moveTask, cancelTasks } = useTasks()
  const { backlogTasks } = useBacklog()
  const functionQueue = useRef<QueuedFunction[]>([])
  const toBeProcessed = useRef<QueuedFunction[]>([])
  const isProcessingQueue = useRef(false)

  // Process the next function in the queue
  const processNextInQueue = async () => {
    if (isProcessingQueue.current || functionQueue.current.length === 0) {
      return
    }

    isProcessingQueue.current = true
    const { name, args, resolve, reject } = functionQueue.current[0]

    try {
      const result = await processFunctionImpl(name, args)
      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      functionQueue.current.shift() // Remove the processed function
      isProcessingQueue.current = false
      
      // Process next item if queue not empty
      if (functionQueue.current.length > 0) {
        processNextInQueue()
      }
    }
  }

  // Implementation of function processing
  const processFunctionImpl = async <T extends FunctionCallArgs>(
    name: FunctionCallName,
    args: T
  ) => {
    setIsProcessing(true)
    try {
        console.log("Processing function:", name)
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
          addTask(date, newTask)

          // Process actual call
          const result = await processCall(name, args)
          return result
        }

        case "mark_tasks_completed": {
          const { task_ids } = args as MarkTasksCompletedArgs
          
          markTasksCompleted(task_ids)
        }

        case "move_task": {
          const { task_id, new_date, new_start_time, new_end_time } = args as MoveTaskArgs
          moveTask(task_id, new_date, new_start_time, new_end_time)
        }

        // case "cancel_tasks": {
        //   const { task_ids } = args as CancelTasksArgs
        //   cancelTasks(task_ids)
        // }

        default:
          return await processCall(name, args)
      }
    } catch (error) {
      console.error("Error processing function:", error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  // Public interface for queueing functions
  const processFunction = async (
    functionCall: FunctionCall
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (functionCall.executeImmediately) {
        functionQueue.current.push({ name: functionCall.name as FunctionCallName, args: functionCall.args, resolve, reject })
      } else {
        toBeProcessed.current.push({ name: functionCall.name as FunctionCallName, args: functionCall.args, resolve, reject })
      }

      processNextInQueue() // Try to process next item
    })
  }

  return (
    <FunctionCallContext.Provider value={{ processFunction, isProcessing }}>
      {children}
    </FunctionCallContext.Provider>
  )
}

export function useFunctionCall() {
  const context = useContext(FunctionCallContext)
  if (!context) {
    throw new Error("useFunctionCall must be used within FunctionCallProvider")
  }
  return context
} 