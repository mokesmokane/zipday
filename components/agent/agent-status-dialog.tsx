"use client"

import { Bot, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useAgent } from "@/lib/context/agent-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useWorkflow } from "@/lib/context/agent-workflow-context"

interface AgentStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgentStatusDialog({ open, onOpenChange }: AgentStatusDialogProps) {
  const { state } = useWorkflow()
  const isActive = state.stage !== "idle" && state.stage !== "completed"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent Status
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Stage */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Stage</h4>
            <div className="flex items-center gap-2 text-sm">
              <div className={`h-2 w-2 rounded-full ${
                isActive ? "bg-primary animate-pulse" : "bg-muted"
              }`} />
              <span className="capitalize">{state.stage}</span>
            </div>
          </div>

          {/* Current Message */}
          {state.currentMessage && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Message</h4>
              <p className="text-sm text-muted-foreground">
                {state.currentMessage}
              </p>
            </div>
          )}

          {/* Todo List */}
          {state.todo_list.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Todo List</h4>
              <ScrollArea className="h-[100px] rounded-md border p-2">
                <ul className="space-y-1">
                  {state.todo_list.map((item, index) => (
                    <li key={index} className="text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}


          {/* Error Message */}
          {state.error && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-destructive">Error</h4>
              <p className="text-sm text-destructive">
                {state.error}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 