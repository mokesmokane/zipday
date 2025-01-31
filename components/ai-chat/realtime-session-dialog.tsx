"use client"

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

interface RealtimeSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  realtimeMode: "debug" | "openai"
  setRealtimeMode: (mode: "debug" | "openai") => void
  voice: string
  setVoice: (voice: string) => void
  onStartSession: () => void
  immediateExecution: boolean
  setImmediateExecution: (enabled: boolean) => void
}

export function RealtimeSessionDialog({
  open,
  onOpenChange,
  realtimeMode,
  setRealtimeMode,
  voice,
  setVoice,
  onStartSession,
  immediateExecution,
  setImmediateExecution
}: RealtimeSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Realtime Session</DialogTitle>
          <DialogDescription>
            Choose how you'd like to interact with the AI assistant in real-time.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <RadioGroup
            value={realtimeMode}
            onValueChange={value => setRealtimeMode(value as "debug" | "openai")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="openai" id="openai" />
              <Label htmlFor="openai">Voice Conversation</Label>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Speak naturally with the AI using your microphone
            </div>

            <div className="mt-4 flex items-center space-x-2">
              <RadioGroupItem value="debug" id="debug" />
              <Label htmlFor="debug">Debug Mode</Label>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Debug mode will not connect to the AI assistant.
            </div>
          </RadioGroup>

          {realtimeMode === "openai" && (
            <div className="mt-6">
              <Label>Voice</Label>
              <RadioGroup value={voice} onValueChange={setVoice} className="mt-2">
                {[
                  { id: "alloy", label: "Alloy" },
                  { id: "ash", label: "Ash" },
                  { id: "ballad", label: "Ballad" },
                  { id: "coral", label: "Coral" },
                  { id: "echo", label: "Echo" },
                  { id: "sage", label: "Sage" },
                  { id: "shimmer", label: "Shimmer" },
                  { id: "verse", label: "Verse" }
                ].map(voice => (
                  <div key={voice.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={voice.id} id={voice.id} />
                    <Label htmlFor={voice.id}>{voice.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="mt-6 space-y-4">
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