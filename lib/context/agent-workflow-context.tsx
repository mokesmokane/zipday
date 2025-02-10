"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { WorkflowCoordinator } from "@/lib/agents/workflow-coordinator"
import { AgentEventPayload } from "@/lib/agents/agent-types"

export interface WorkflowState {
  stage: "idle" | "running" | "completed" | "error"
  todo_list: Record<string, boolean>
  context?: string
  currentMessage?: string
  error?: string
}

export const ALL_EVENT_TYPES = [
  "roundStart",
  "phaseDecision",
  "roundEnd",
  "gatherStart",
  "gatherComplete",
  "planBuildStart",
  "planBuildComplete",
  "executeStart",
  "executeComplete",
  "executeCodeStart",
  "executeCodeError",
  "executeCodeComplete",
  "pseudoCode",
  "code",
  "STOP",
  "finished",
  "error"
] as const

export type EventType = typeof ALL_EVENT_TYPES[number]

export interface EventItem {
  id: string
  type: EventType
  timestamp: Date
  payload: AgentEventPayload
}

interface WorkflowContextType {
  state: WorkflowState
  events: EventItem[]
  visibleEventTypes: Set<EventType>
  startWorkflow: (todo_list: string[], context?: string) => Promise<void>
  stopWorkflow: () => void
  getCoordinator: () => WorkflowCoordinator | null
  clearEvents: () => void
  toggleEventTypeVisibility: (type: EventType) => void
  resetVisibleEventTypes: () => void
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined)

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [visibleEventTypes, setVisibleEventTypes] = useState<Set<EventType>>(new Set(ALL_EVENT_TYPES))
  const [state, setState] = useState<WorkflowState>({
    stage: "idle",
    todo_list: {}
  })
  const [coordinator, setCoordinator] = useState<WorkflowCoordinator | null>(null)

  const addEvent = useCallback((type: EventType, payload: AgentEventPayload) => {
    console.log("Adding event:", type, payload)
    setEvents(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      type,
      timestamp: new Date(),
      payload
    }])
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  const toggleEventTypeVisibility = useCallback((type: EventType) => {
    setVisibleEventTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }, [])

  const resetVisibleEventTypes = useCallback(() => {
    setVisibleEventTypes(new Set(ALL_EVENT_TYPES))
  }, [])

  const initializeCoordinator = (todo_list: string[], context?: string) => {
    // Create a new coordinator instance with the provided todo_list and context
    const newCoordinator = new WorkflowCoordinator(
      "",
      Object.fromEntries(todo_list.map(task => [task, false]))
    )

    // Set up event listeners for this coordinator instance
    newCoordinator.on("roundStart", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Starting round with context: ${payload.context}`)
      addEvent("roundStart", payload)
      setState(prev => ({
        ...prev,
        currentMessage: `Starting round ${payload.round} with context: ${payload.context}`
      }))
    })

    newCoordinator.on("phaseDecision", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Phase decision: ${payload.decision}`)
      addEvent("phaseDecision", payload)
      setState(prev => ({
        ...prev,
        currentMessage: `Round ${payload.round}: ${payload.decision}`
      }))
    })

    newCoordinator.on("roundEnd", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Ending round; Todo: ${payload.todo}`)
      addEvent("roundEnd", payload)
      setState(prev => ({
        ...prev,
        currentMessage: `Completed round ${payload.round}. Todo: ${payload.todo}`
      }))
    })

    newCoordinator.on("finished", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Workflow finished! Final context: ${payload.context}`)
      addEvent("finished", payload)
      setState(prev => ({
        ...prev,
        stage: "completed",
        currentMessage: "Workflow completed successfully",
        context: payload.context
      }))
    })

    newCoordinator.on("STOP", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Workflow stopped`)
      addEvent("STOP", payload)
      setState(prev => ({
        ...prev,
        stage: "idle",
        currentMessage: "Workflow stopped"
      }))
    })

    newCoordinator.on("executeCodeStart", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Starting code execution`)
      addEvent("executeCodeStart", payload)
      setState(prev => ({
        ...prev,
        currentMessage: `Round ${payload.round}: Executing code...`
      }))
    })

    newCoordinator.on("error", (payload: AgentEventPayload) => {
      console.error(`[Round ${payload.round}] Error encountered: ${payload.error}`)
      addEvent("error", payload)
      setState(prev => ({
        ...prev,
        stage: "error",
        error: payload.error?.toString() || "Unknown error",
        currentMessage: `Error in round ${payload.round}: ${payload.error}`
      }))
    })

    newCoordinator.on("executeCodeError", (payload: AgentEventPayload) => {
      console.error(`[Round ${payload.round}] Code execution error: ${payload.error}`)
      addEvent("executeCodeError", payload)
      setState(prev => ({
        ...prev,
        currentMessage: `Error in round ${payload.round}: ${payload.error}`
      }))
    })

    newCoordinator.on("executeCodeComplete", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Code execution complete`)
      addEvent("executeCodeComplete", payload)
      setState(prev => ({
        ...prev,
        currentMessage: `Completed round ${payload.round}: Code execution complete`
      }))
    })

    newCoordinator.on("executeComplete", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Execution complete`)
      addEvent("executeComplete", payload)
      setState(prev => ({
        ...prev,
        currentMessage: `Completed round ${payload.round}: Execution complete`
      }))
    })

    newCoordinator.on("code", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Code: ${payload.code}`)
      addEvent("code", payload)
      setState(prev => ({
        ...prev,
        currentMessage: `Round ${payload.round}: Code: ${payload.code}`
      }))
    })
    
    newCoordinator.on("pseudoCode", (payload: AgentEventPayload) => {
      console.log(`[Round ${payload.round}] Pseudo-code: ${payload.pseudoCode}`)
      addEvent("pseudoCode", payload)
      setState(prev => ({
        ...prev,
        currentMessage: `Round ${payload.round}: Pseudo-code: ${payload.pseudoCode}`
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
        events,
        visibleEventTypes,
        startWorkflow,
        stopWorkflow,
        getCoordinator,
        clearEvents,
        toggleEventTypeVisibility,
        resetVisibleEventTypes
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
