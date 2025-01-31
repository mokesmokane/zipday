"use client"

import {
  FunctionCall,
  FunctionCallArgs,
  FunctionCallName
} from "@/types/function-call-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { Bot, MoreVertical, ChevronRight, ChevronDown } from "lucide-react"
import { useRealtime, Transcript } from "@/lib/context/transcription-context"
import { cn } from "@/lib/utils"
import { processCall } from "@/lib/function-call-processor"
import { useFunctionCall } from "@/lib/context/function-call-context"

interface FunctionCallDisplayProps {
  functionCall: FunctionCall
  index: number
}

interface JsonViewerProps {
  data: any
  level?: number
}

function JsonViewer({ data, level = 0 }: JsonViewerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // If the data is a string that looks like JSON, try to parse it
  let parsedData = data
  if (typeof data === "string") {
    try {
      parsedData = JSON.parse(data)
    } catch {
      // If it's not valid JSON, keep it as a string
      parsedData = data
    }
  }

  if (typeof parsedData !== "object" || parsedData === null) {
    return (
      <span
        className={cn(
          "font-mono",
          typeof parsedData === "string" && "text-green-600",
          typeof parsedData === "number" && "text-blue-600",
          typeof parsedData === "boolean" && "text-purple-600",
          parsedData === null && "text-gray-500"
        )}
      >
        {typeof parsedData === "string"
          ? `"${parsedData}"`
          : String(parsedData)}
      </span>
    )
  }

  const isArray = Array.isArray(parsedData)
  const items = isArray ? parsedData : Object.entries(parsedData)
  const isEmpty = items.length === 0

  if (isEmpty) {
    return <span className="text-gray-500">{isArray ? "[]" : "{}"}</span>
  }

  const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown

  return (
    <div style={{ marginLeft: level > 0 ? "1.5rem" : 0 }}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="group mb-1 flex items-center gap-1 hover:text-blue-500"
      >
        <ChevronIcon className="size-4 transition-transform" />
        <span className="text-muted-foreground text-xs">
          {isArray ? `Array[${items.length}]` : `Object{${items.length}}`}
        </span>
      </button>

      {!isCollapsed && (
        <div className="border-l pl-4">
          {!isArray &&
            (items as [string, unknown][]).map(([key, value]) => (
              <div key={key} className="group py-1">
                <div className="flex items-start">
                  <span className="font-medium text-blue-600">{key}</span>
                  <span className="text-muted-foreground mx-2">:</span>
                  <div className="flex-1">
                    <JsonViewer data={value} level={level + 1} />
                  </div>
                </div>
              </div>
            ))}
          {isArray &&
            items.map((item: unknown, index: number) => (
              <div key={index} className="group py-1">
                <div className="flex items-start">
                  <span className="text-muted-foreground font-medium">
                    [{index}]
                  </span>
                  <span className="text-muted-foreground mx-2">=</span>
                  <div className="flex-1">
                    <JsonViewer data={item} level={level + 1} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export function FunctionCallDisplay({
  functionCall,
  index
}: FunctionCallDisplayProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const { messages } = useRealtime()

  // Get messages around this function call (2 before and 2 after)
  const surroundingMessages = messages
    .slice(Math.max(0, index - 2), Math.min(messages.length, index + 3))
    .filter((msg): msg is Transcript => msg instanceof Transcript)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 self-start rounded-xl bg-purple-100 px-3 py-2 text-sm text-purple-700 hover:bg-purple-200"
        >
          <Bot className="size-4" />
          <span>{functionCall.name}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-50 hover:opacity-100"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowMessages(!showMessages)}>
              {showMessages ? "Hide Context" : "View Context"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showMessages && surroundingMessages.length > 0 && (
        <div className="ml-8 space-y-2">
          {surroundingMessages.map((msg, i) => (
            <div
              key={i}
              data-role={msg.role}
              className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-700"
            >
              <div className="mb-1 text-xs opacity-50">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
              {msg.content}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Function Call: {functionCall.name}</DialogTitle>
            <DialogDescription>
              Details of the function call and its arguments
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <h4 className="mb-4 font-medium">Arguments:</h4>
            <div className="bg-card rounded-lg border p-4">
              <JsonViewer data={functionCall.args} />
            </div>
          </div>
          <ExecuteFunctionButton functionCall={functionCall} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ExecuteFunctionButton({
  functionCall
}: {
  functionCall: FunctionCall
}) {
  const { processFunction, isProcessing } = useFunctionCall()

  const handleExecute = async () => {
    try {
      const result = await processFunction(functionCall)
      console.log("Function executed successfully:", result)
    } catch (error) {
      console.error("Error executing function:", error)
    }
  }

  return (
    <Button onClick={handleExecute} disabled={isProcessing}>
      {isProcessing ? "Processing..." : "Execute Function"}
    </Button>
  )
}
