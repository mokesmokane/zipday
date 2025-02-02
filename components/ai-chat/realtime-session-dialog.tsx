"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { useVoiceSession } from "@/lib/context/voice-session-context"
import { cn } from "@/lib/utils"
import { getFunctionCallsByCategory, FUNCTION_CALL_UI_METADATA, FunctionCallUIMetadata } from "@/types/function-call-types"
import React from "react"

interface RealtimeSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartSession: () => void
}

export function RealtimeSessionDialog({
  open,
  onOpenChange,
  onStartSession
}: RealtimeSessionDialogProps) {
  const {
    voice,
    setVoice,
    immediateExecution,
    setImmediateExecution,
    selectedFunctions,
    setSelectedFunctions,
    isPlanMode,
    setIsPlanMode
  } = useVoiceSession()

  // Update selected functions when plan mode changes
  React.useEffect(() => {
    if (isPlanMode) {
      // In plan mode, only allow plan-related functions
      const planFunctions = FUNCTION_CALL_UI_METADATA
        .filter((f: FunctionCallUIMetadata) => f.planMode)
        .map((f: FunctionCallUIMetadata) => f.id)
      setSelectedFunctions(planFunctions)
    } else {
      // In normal mode, reset to default functions
      const defaultFunctions = FUNCTION_CALL_UI_METADATA
        .filter((f: FunctionCallUIMetadata) => !f.planMode)
        .map((f: FunctionCallUIMetadata) => f.id)
      setSelectedFunctions(defaultFunctions)
    }
  }, [isPlanMode, setSelectedFunctions])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start Voice Session</DialogTitle>
          <DialogDescription>
            Configure your voice interaction settings with the AI assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Voice Selection */}
          <div>
            <Label>Assistant Voice</Label>
            <RadioGroup value={voice} onValueChange={setVoice} className="mt-2">
              {[
                { id: "alloy", label: "Alloy" },
                { id: "echo", label: "Echo" },
                { id: "fable", label: "Fable" },
                { id: "onyx", label: "Onyx" },
                { id: "nova", label: "Nova" },
                { id: "shimmer", label: "Shimmer" }
              ].map(voice => (
                <div key={voice.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={voice.id} id={voice.id} />
                  <Label htmlFor={voice.id}>{voice.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Mode Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Plan Mode</Label>
                <div className="text-sm text-gray-500">
                  Only allow the AI to update your plan
                </div>
              </div>
              <Switch
                checked={isPlanMode}
                onCheckedChange={setIsPlanMode}
              />
            </div>
          </div>

          {/* Function Selection */}
          <div className="space-y-6">
            <Label>Available Functions</Label>
            {Object.entries(getFunctionCallsByCategory(isPlanMode)).map(([category, functions]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground capitalize">
                  {category}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {functions.map(func => {
                    const isSelected = selectedFunctions.includes(func.id)
                    return (
                      <Badge
                        key={func.id}
                        variant="outline"
                        className={cn(
                          "cursor-pointer select-none px-3 py-2 hover:bg-primary/10",
                          isSelected && "bg-primary/20 hover:bg-primary/30",
                          isPlanMode && "cursor-not-allowed opacity-50"
                        )}
                        onClick={() => {
                          if (!isPlanMode) {
                            if (isSelected) {
                              setSelectedFunctions(selectedFunctions.filter(f => f !== func.id))
                            } else {
                              setSelectedFunctions([...selectedFunctions, func.id])
                            }
                          }
                        }}
                        title={func.description}
                      >
                        <span className="mr-1">{func.icon}</span>
                        {func.label}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Immediate Execution - Only show if not in plan mode */}
          {!isPlanMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Immediate Function Execution</Label>
                  <div className="text-sm text-gray-500">
                    Automatically execute function calls without confirmation
                  </div>
                </div>
                <Switch
                  checked={immediateExecution}
                  onCheckedChange={setImmediateExecution}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onStartSession}>Start Session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 