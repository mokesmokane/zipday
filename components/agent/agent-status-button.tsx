"use client"

import { useState } from "react"
import { Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAgent } from "@/lib/context/agent-context"
import { AgentStatusDialog } from "./agent-status-dialog"
import { cn } from "@/lib/utils"

export function AgentStatusButton() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { state } = useAgent()
  const isActive = state.stage !== "idle" && state.stage !== "completed"

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "gap-2 h-8",
          isActive && "text-primary animate-pulse"
        )}
        onClick={() => setDialogOpen(true)}
      >
        <Bot className="h-4 w-4" />
        {isActive && (
          <span className="text-xs">
            {state.stage === "gathering" ? "Gathering Info" : "Executing Tasks"}
          </span>
        )}
      </Button>

      <AgentStatusDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </>
  )
} 