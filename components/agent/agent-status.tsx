"use client"

import { useEffect, useState } from "react"
import { AgentState } from "@/lib/context/agent-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AgentStatusProps {
  agentManager: any // Type this properly based on your agent manager
}

type BadgeVariant = "secondary" | "default" | "destructive" | "outline"

export function AgentStatus({ agentManager }: AgentStatusProps) {
  const [state, setState] = useState<AgentState>(agentManager.getState())
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    // Listen for state changes
    const handleStateChange = (newState: AgentState) => {
      setState(newState)
      if (newState.currentMessage) {
        setMessages(prev => [...prev, newState.currentMessage as string])
      }
    }

    // Listen for tool calls
    const handleToolCalls = (toolCalls: any[]) => {
      toolCalls.forEach(call => {
        setMessages(prev => [...prev, `Function called: ${call.name}`])
      })
    }

    agentManager.on("stateChange", handleStateChange)
    agentManager.on("toolCalls", handleToolCalls)

    return () => {
      agentManager.off("stateChange", handleStateChange)
      agentManager.off("toolCalls", handleToolCalls)
    }
  }, [agentManager])

  // Get badge color based on stage
  const getBadgeVariant = (stage: AgentState["stage"]): BadgeVariant => {
    switch (stage) {
      case "gathering":
        return "secondary"
      case "executing":
        return "default"
      case "completed":
        return "default"
      case "error":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Agent Status</span>
          <Badge variant={getBadgeVariant(state.stage)}>{state.stage}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Todo List */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Tasks to Complete:</h3>
          <ul className="list-disc pl-4">
            {state.todo_list.map((task, index) => (
              <li key={index} className="text-sm">{task}</li>
            ))}
          </ul>
        </div>
        {/* Chunks Log */}
        <div>
          <h3 className="font-semibold mb-2">Progress:</h3>
          <ScrollArea className="h-[200px] rounded-md border p-4">
            {state.chunks.map((chunk, index) => (
              <div key={index} className="text-sm mb-2">
                {chunk}
              </div>
            ))}
          </ScrollArea>
        </div>
        {/* Messages Log */}
        <div>
          <h3 className="font-semibold mb-2">Progress:</h3>
          <ScrollArea className="h-[200px] rounded-md border p-4">
            {messages.map((message, index) => (
              <div key={index} className="text-sm mb-2">
                {message}
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md">
            {state.error}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 