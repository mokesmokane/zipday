"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { WorkflowCoordinator } from "@/lib/agents/workflow-coordinator"
import { AgentEventPayload } from "@/lib/agents/agent-types"

export interface WorkflowState {
  stage: "idle" | "running" | "completed" | "error"
  todo_list: Record<string, boolean>
  context?: string
  currentMessage?: string
  error?: string
}

interface WorkflowContextType {
  state: WorkflowState
  startWorkflow: (todo_list: string[], context?: string) => Promise<void>
  stopWorkflow: () => void
  getCoordinator: () => WorkflowCoordinator | null
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined)

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkflowState>({
    stage: "idle",
    todo_list: {}
  })

  const [coordinator, setCoordinator] = useState<WorkflowCoordinator | null>(null)

  const initializeCoordinator = (todo_list: string[], context?: string) => {
    // Create a new coordinator instance with the provided todo_list and context
    const newCoordinator = new WorkflowCoordinator(
      "",
      Object.fromEntries(todo_list.map(task => [task, false]))
    )

    // Set up event listeners for this coordinator instance
    newCoordinator.on("roundStart", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Starting round with context: ${payload.context}`)
      setState(prev => ({
        ...prev,
        currentMessage: `Starting round ${payload.round} with context: ${payload.context}`
      }))
    })

    newCoordinator.on("phaseDecision", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Phase decision: ${payload.decision}`)
      setState(prev => ({
        ...prev,
        currentMessage: `Round ${payload.round}: ${payload.decision}`
      }))
    })

    newCoordinator.on("roundEnd", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Ending round; Todo: ${payload.todo}`)
      setState(prev => ({
        ...prev,
        currentMessage: `Completed round ${payload.round}. Todo: ${payload.todo}`
      }))
    })

    newCoordinator.on("finished", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Workflow finished! Final context: ${payload.context}`)
      setState(prev => ({
        ...prev,
        stage: "completed",
        currentMessage: "Workflow completed successfully",
        context: payload.context
      }))
    })

    newCoordinator.on("error", (payload: AgentEventPayload) => {
      console.error(`[Round ${payload.round}] Error encountered: ${payload.error}`)
      setState(prev => ({
        ...prev,
        stage: "error",
        error: payload.error?.toString() || "Unknown error",
        currentMessage: `Error in round ${payload.round}: ${payload.error}`
      }))
    })

    setCoordinator(newCoordinator)
    return newCoordinator
  }

  const startWorkflow = async (todo_list: string[], context?: string) => {
    try {
      // Update state to running
      setState({
        stage: "running",
        todo_list: Object.fromEntries(todo_list.map(task => [task, false])),
        context,
        currentMessage: "Starting workflow..."
      })

      // Initialize a new coordinator with the provided parameters
      console.log("Initializing coordinator...")
      console.log("Todo list:", todo_list)
      if(todo_list.length === 0) {
        throw new Error("Todo list is empty")
      }
      const newCoordinator = initializeCoordinator(todo_list, context)
      
      if (!newCoordinator) {
        throw new Error("Failed to initialize workflow coordinator")
      }

      await newCoordinator.run()
      console.log("Workflow completed successfully.")
    } catch (error) {
      console.error("Workflow encountered an error:", error)
      setState(prev => ({
        ...prev,
        stage: "error",
        error: error instanceof Error ? error.message : "An unknown error occurred",
        currentMessage: "Workflow failed"
      }))
      throw error
    }
  }

  const stopWorkflow = () => {
    if (coordinator) {
      coordinator.stop()
      setState({
        stage: "idle",
        todo_list: {},
        currentMessage: "Workflow stopped"
      })
      setCoordinator(null)
    }
  }

  const getCoordinator = () => coordinator

  return (
    <WorkflowContext.Provider
      value={{
        state,
        startWorkflow,
        stopWorkflow,
        getCoordinator
      }}
    >
      {children}
    </WorkflowContext.Provider>
  )
}

export function useWorkflow() {
  const context = useContext(WorkflowContext)
  if (context === undefined) {
    throw new Error("useWorkflow must be used within a WorkflowProvider")
  }
  return context
}
