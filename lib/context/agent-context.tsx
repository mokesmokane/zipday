"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface ToolCall {
  name: string
  response: any
}

export interface AgentState {
  stage: "idle" | "gathering" | "executing" | "completed" | "error"
  todo_list: string[]
  chunks: string[]
  context?: string
  queryResults?: Record<string, any>
  currentMessage?: string
  error?: string
}

interface AgentContextType {
  state: AgentState
  executePlan: (todo_list: string[], context?: string) => Promise<void>
}

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AgentState>({
    stage: "idle",
    chunks: [],
    todo_list: []
  })

  const processChunk = (chunk: { type: string; toolCalls?: ToolCall[]; text?: string }) => {
    // Update current message if there's text
    if (chunk.text) {
      setState(prev => ({ ...prev, currentMessage: chunk.text }))
    }
    if (chunk.text) {   
      // Add chunk to chunks array
      setState(prev => ({ ...prev, chunks: [...prev.chunks, chunk.text!] }))
    }
  }

  const uint8ArrayToString = (array: Uint8Array): string => {
    return new TextDecoder().decode(array)
  }

  const executePlan = async (todo_list: string[], context?: string) => {
    try {
      // Initialize state
      setState({
        stage: "gathering",
        todo_list,
        chunks: [],
        context,
        currentMessage: "Starting information gathering phase..."
      })

      // Information Gathering Phase
      const gatherResponse = await fetch("/api/agent/gather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todo_list, context })
      })

      const data = await gatherResponse.json()
      console.log("data:", data)

      if (!gatherResponse.ok || !gatherResponse.body) {
        throw new Error("Failed to start gathering phase")
      }

      // Process gathering stream
      const gatherReader = gatherResponse.body.getReader()
      const queryResults: Record<string, any> = {}

      try {
        while (true) {
          const { done, value } = await gatherReader.read()
          if (done) break

          try {
            const chunk = JSON.parse(uint8ArrayToString(value))
            processChunk(chunk)

            // Collect query results
            if (chunk.type === "tool-calls" && chunk.toolCalls) {
              chunk.toolCalls.forEach((call: ToolCall) => {
                queryResults[call.name] = call.response
              })
            }
          } catch (e) {
            // Skip non-JSON chunks
            continue
          }
        }
      } finally {
        gatherReader.releaseLock()
      }

      // Update state for execution phase
      setState(prev => ({
        ...prev,
        stage: "executing",
        queryResults,
        currentMessage: "Starting task execution phase..."
      }))

      // Task Execution Phase
      const executeResponse = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todo_list, queryResults, context })
      })

      if (!executeResponse.ok || !executeResponse.body) {
        throw new Error("Failed to start execution phase")
      }

      // Process execution stream
      const executeReader = executeResponse.body.getReader()

      try {
        while (true) {
          const { done, value } = await executeReader.read()
          if (done) break

          try {
            const chunk = JSON.parse(uint8ArrayToString(value))
            processChunk(chunk)
          } catch (e) {
            // Skip non-JSON chunks
            continue
          }
        }
      } finally {
        executeReader.releaseLock()
      }

      // Mark as completed
      setState(prev => ({
        ...prev,
        stage: "completed",
        currentMessage: "Plan execution completed successfully."
      }))

    } catch (error) {
      // Handle errors
      setState(prev => ({
        ...prev,
        stage: "error",
        error: error instanceof Error ? error.message : "An unknown error occurred",
        currentMessage: "Plan execution failed."
      }))
    }
  }

  return (
    <AgentContext.Provider
      value={{
        state,
        executePlan
      }}
    >
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  const context = useContext(AgentContext)
  if (context === undefined) {
    throw new Error("useAgent must be used within an AgentProvider")
  }
  return context
} 