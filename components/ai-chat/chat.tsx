"use client"

import React, { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useChat } from "ai/react"
import {
  ArrowUpIcon,
  MessageCircle,
  Play,
  Square,
  Maximize2,
  Minimize2,
  Bot,
  MoreVertical,
  ListTodo,
  Calendar,
  Brain,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { AutoResizeTextarea } from "@/components/ai-chat/autoresize-textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AIVoiceVisualizer } from "@/components/ai-chat/ai-voice-visualizer"
import { useRealtimeAudio } from "@/lib/hooks/use-realtime-audio"
import { useSidebar } from "@/lib/context/sidebar-context"
import { useAiContext } from "@/lib/context/ai-context"
import { Textarea } from "@/components/ui/textarea"
import { Transcript, useRealtime } from "@/lib/context/transcription-context"
import { ActionCall, FunctionCall, QueryCall } from "@/types/function-call-types"
import { PulsatingSphereVisualizer } from "./ai-voice-sphere"
import { FunctionCallDisplay } from "@/components/ai-chat/function-call-display"
import { RealtimeMessagesWindow } from "@/components/ai-chat/realtime-messages-window"
import { RealtimeSessionDialog } from "@/components/ai-chat/realtime-session-dialog"
import { useDroppable } from "@dnd-kit/core"
import { Task } from "@/types/daily-task-types"

interface TaskDropMenuProps {
  task: Task
  onClose: () => void
  onAction: (action: string) => void
}

function TaskDropMenu({ task, onClose, onAction }: TaskDropMenuProps) {
  const actions = [
    {
      id: "enhance",
      label: "Enhance Task Details",
      description: "Add more detailed subtasks and description",
      icon: Brain
    },
    {
      id: "schedule",
      label: "Smart Schedule",
      description: "Find the best time slot in your calendar",
      icon: Calendar
    },
    {
      id: "breakdown",
      label: "Task Breakdown",
      description: "Break down into smaller manageable tasks",
      icon: ListTodo
    },
    {
      id: "optimize",
      label: "Optimize Task",
      description: "Suggest improvements and optimizations",
      icon: Sparkles
    }
  ]

  return (
    <Card className="w-[300px]">
      <CardHeader>
        <CardTitle className="text-sm">AI Actions for: {task.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {actions.map(action => (
          <Button
            key={action.id}
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => onAction(action.id)}
          >
            <action.icon className="size-4" />
            <div className="flex flex-col items-start">
              <div className="font-medium">{action.label}</div>
              <div className="text-muted-foreground text-xs">
                {action.description}
              </div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}

export function ChatForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { messages, input, setInput, append } = useChat({
    api: "/api/chat"
  })

  const [isPoppedOut, setIsPoppedOut] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 400, height: 500 })
  const [isResizing, setIsResizing] = useState(false)
  const resizeDirection = useRef<string | null>(null)
  const initialSize = useRef({ width: 0, height: 0 })
  const initialPosition = useRef({ x: 0, y: 0 })
  const { isExpanded } = useSidebar()
  const { text: context, idMappings } = useAiContext()

  const [showRealtimeDialog, setShowRealtimeDialog] = useState(false)
  const [showContextDialog, setShowContextDialog] = useState(false)
  const [showRealtimeMessages, setShowRealtimeMessages] = useState(false)
  const {
    messages: realtimeMessages,
    addMessage,
    clearMessages
  } = useRealtime()

  const {
    isSessionActive,
    dataChannel,
    audioLevels,
    userAudioLevels,
    startSession,
    stopSession
  } = useRealtimeAudio({
    idMappings: idMappings
  })

  const [droppedTask, setDroppedTask] = useState<Task | null>(null)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: "ai-chat-droppable"
  })

  // Add effect to listen for task drops
  useEffect(() => {
    const handleTaskDrop = (e: CustomEvent<Task>) => {
      setDroppedTask(e.detail)
    }

    const element = document.querySelector("[data-droppable-id='ai-chat-droppable']")
    if (element) {
      element.addEventListener("taskdrop", handleTaskDrop as EventListener)
    }

    return () => {
      if (element) {
        element.removeEventListener("taskdrop", handleTaskDrop as EventListener)
      }
    }
  }, [])

  const handlePopOutToggle = () => {
    setIsPoppedOut(!isPoppedOut)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isSessionActive) {
      // Normal chat mode
      void append({ content: input, role: "user" })
    } else {
      // Realtime session active - send via data channel
      if (dataChannel && dataChannel.readyState === "open") {
        const event = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: input
              }
            ]
          }
        }
        dataChannel.send(JSON.stringify(event))
        // Also request a response
        dataChannel.send(JSON.stringify({ type: "response.create" }))
      }
    }
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
    }
  }

  const messageList = (
    <div className="my-4 flex h-fit min-h-full flex-col gap-4">
      {messages.map((message, index) => (
        <div
          key={index}
          data-role={message.role}
          className="max-w-[80%] rounded-xl px-3 py-2 text-sm data-[role=assistant]:self-start data-[role=user]:self-end data-[role=assistant]:bg-gray-100 data-[role=user]:bg-blue-500 data-[role=assistant]:text-black data-[role=user]:text-white"
        >
          {message.content}
        </div>
      ))}
    </div>
  )

  const realtimeMessageList = (
    <div className="my-4 flex h-fit min-h-full flex-col gap-4">
      {realtimeMessages.map((message, index) => {
        if (message instanceof ActionCall || message instanceof QueryCall) {
          return (
            <FunctionCallDisplay
              key={index}
              functionCall={message}
              index={index}
            />
          )
        }
        return (
          <div
            key={index}
            data-role={(message as Transcript).role}
            className="max-w-[80%] rounded-xl px-3 py-2 text-sm data-[role=assistant]:self-start data-[role=user]:self-end data-[role=assistant]:bg-gray-100 data-[role=user]:bg-blue-500 data-[role=assistant]:text-black data-[role=user]:text-white"
          >
            {(message as Transcript).content}
          </div>
        )
      })}
    </div>
  )

  const handleTaskAction = async (action: string) => {
    if (!droppedTask) return

    let prompt = ""
    switch (action) {
      case "enhance":
        prompt = `Please enhance this task with more detailed subtasks and description. Here's the current task: ${JSON.stringify(droppedTask, null, 2)}

Please provide:
1. An expanded description that clarifies the goal and context
2. A detailed list of subtasks that break down the implementation
3. Any additional considerations or dependencies`
        break
      case "schedule":
        prompt = `Please suggest the best time slot for this task considering my calendar. Here's the task: ${JSON.stringify(droppedTask, null, 2)}

Please consider:
1. Task duration and urgency
2. Best practices for this type of task
3. Typical scheduling patterns
4. Dependencies and prerequisites`
        break
      case "breakdown":
        prompt = `Please break down this task into smaller manageable tasks. Here's the current task: ${JSON.stringify(droppedTask, null, 2)}

Please provide:
1. A logical sequence of smaller tasks
2. Estimated time for each sub-task
3. Dependencies between tasks
4. Any prerequisites or preparation needed`
        break
      case "optimize":
        prompt = `Please suggest improvements and optimizations for this task. Here's the current task: ${JSON.stringify(droppedTask, null, 2)}

Please suggest:
1. Ways to make the task more efficient
2. Potential automation opportunities
3. Best practices that could be applied
4. Resources that could help`
        break
    }

    if (prompt) {
      void append({ content: prompt, role: "user" })
    }
    setDroppedTask(null)
  }

  const mainContent = (
    <main
      ref={setDroppableRef}
      data-droppable-id="ai-chat-droppable"
      className={cn(
        "ring-none flex size-full flex-col items-stretch border-none",
        className,
        isOver && "bg-accent/50"
      )}
      {...props}
    >
      {droppedTask && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <TaskDropMenu
            task={droppedTask}
            onClose={() => setDroppedTask(null)}
            onAction={handleTaskAction}
          />
        </div>
      )}
      <div className="min-h-0 flex-1 content-center overflow-y-auto px-6 [&::-webkit-scrollbar]:hidden">
        {isSessionActive ? (
          <>
            <div className="flex h-full items-start justify-center gap-2 pt-[10%]">
              <PulsatingSphereVisualizer
                isActive={isSessionActive}
                audioLevel={audioLevels[0]}
                className="size-48 cursor-pointer transition-opacity hover:opacity-80"
                color="purple"
                onClick={() => {
                  if (dataChannel && dataChannel.readyState === "open") {
                    const event = {
                      type: "conversation.item.create",
                      item: {
                        type: "message",
                        role: "user",
                        content: [
                          {
                            type: "input_text",
                            text: "mark yesterdays tasks as completed and move any backlog tasks to this afternoon"
                          }
                        ]
                      }
                    }
                    dataChannel.send(JSON.stringify(event))
                    // Also request a response
                    dataChannel.send(JSON.stringify({ type: "response.create" }))
                  }
                }}
              />
            </div>
          </>
        ) : messages.length ? (
          messageList
        ) : (
          <div className="text-muted-foreground text-center">
            No messages yet
          </div>
        )}
      </div>
      <div className="shrink-0">
        <div className="mx-6 mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {isSessionActive && (
              <PulsatingSphereVisualizer
                isActive={isSessionActive}
                audioLevel={userAudioLevels[userAudioLevels.length - 1]}
                className="size-8 shrink-0"
                color="green"
              />
            )}
            <form
              onSubmit={handleSubmit}
              className="border-input bg-background focus-within:ring-ring/10 relative flex flex-1 items-center gap-2 rounded-[16px] border px-3 py-1.5 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0"
            >
              <AutoResizeTextarea
                onKeyDown={handleKeyDown}
                onChange={v => setInput(v)}
                value={input}
                placeholder="Enter a message"
                className="placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none"
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="size-8 rounded-full"
                  >
                    <ArrowUpIcon size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Submit</TooltipContent>
              </Tooltip>
            </form>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={
                    isSessionActive
                      ? stopSession
                      : () => setShowRealtimeDialog(true)
                  }
                  className={cn(
                    "size-8 rounded-full",
                    isSessionActive
                      ? "hover:bg-red-100 hover:text-red-600"
                      : "hover:bg-green-100 hover:text-green-600"
                  )}
                >
                  {isSessionActive ? (
                    <Square className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isSessionActive ? "Stop Session" : "Start Realtime Session"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      <RealtimeSessionDialog
        open={showRealtimeDialog}
        onOpenChange={setShowRealtimeDialog}
        onStartSession={() => {
          setShowRealtimeDialog(false)
          startSession(context)
        }}
      />
    </main>
  )

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPoppedOut) return
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    const newX = e.clientX - dragOffset.current.x
    const newY = e.clientY - dragOffset.current.y
    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    } else {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  const handleResizeMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    direction: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeDirection.current = direction
    initialSize.current = { width: size.width, height: size.height }
    initialPosition.current = { x: e.clientX, y: e.clientY }
  }

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return

    const dx = e.clientX - initialPosition.current.x
    const dy = e.clientY - initialPosition.current.y

    switch (resizeDirection.current) {
      case "e":
        setSize(prev => ({
          ...prev,
          width: Math.max(300, initialSize.current.width + dx)
        }))
        break
      case "s":
        setSize(prev => ({
          ...prev,
          height: Math.max(400, initialSize.current.height + dy)
        }))
        break
      case "se":
        setSize({
          width: Math.max(300, initialSize.current.width + dx),
          height: Math.max(400, initialSize.current.height + dy)
        })
        break
      case "n":
        {
          const newHeight = Math.max(200, initialSize.current.height - dy)
          setSize(prev => ({ ...prev, height: newHeight }))
        }
        break
    }
  }

  const handleResizeUp = () => {
    setIsResizing(false)
    resizeDirection.current = null
  }

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove)
      window.addEventListener("mouseup", handleResizeUp)
    } else {
      window.removeEventListener("mousemove", handleResizeMove)
      window.removeEventListener("mouseup", handleResizeUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleResizeMove)
      window.removeEventListener("mouseup", handleResizeUp)
    }
  }, [isResizing])

  const headerContent = (
    <div className="flex items-center gap-2">
      <MessageCircle className="size-5" />
      <CardTitle className="flex-1 text-sm font-medium">AI Assistant</CardTitle>
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
          <DropdownMenuItem onClick={() => setShowContextDialog(true)}>
            View Context
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowRealtimeMessages(!showRealtimeMessages)}
          >
            {showRealtimeMessages ? "Hide Messages" : "Show Messages"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePopOutToggle}
        className="size-7 opacity-50 hover:opacity-100"
      >
        {isPoppedOut ? (
          <Minimize2 className="size-4" />
        ) : (
          <Maximize2 className="size-4" />
        )}
      </Button>
    </div>
  )

  if (!isPoppedOut) {
    // Inline mode
    if (!isExpanded) {
      return (
        <div className="flex justify-center p-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-accent size-10 p-0"
            onClick={() => setIsPoppedOut(true)}
          >
            <Bot className="size-4" />
          </Button>
        </div>
      )
    }
    return (
      <>
        <Card
          className="relative flex flex-col border-none shadow-none"
          style={{ height: size.height }}
        >
          <CardHeader className="shrink-0 p-4">{headerContent}</CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-4 pt-0">
            {mainContent}
          </CardContent>

          <div
            className="group absolute inset-x-0 top-0 h-2 cursor-n-resize hover:bg-gray-300/20"
            onMouseDown={e => handleResizeMouseDown(e, "n")}
          >
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gray-200 group-hover:bg-gray-400 dark:bg-gray-700 dark:group-hover:bg-gray-500" />
          </div>
        </Card>

        <Dialog open={showContextDialog} onOpenChange={setShowContextDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Current Context</DialogTitle>
              <DialogDescription>
                This is the current context being used by the AI assistant.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={`context: ${context}
idMappings: ${JSON.stringify(idMappings, null, 2)}
              `}
                readOnly
                className="h-[400px] font-mono text-sm"
              />
            </div>
          </DialogContent>
        </Dialog>

        <RealtimeMessagesWindow 
          isOpen={isSessionActive && showRealtimeMessages}
          onClose={() => setShowRealtimeMessages(false)} 
        />
      </>
    )
  }

  // Popped out mode
  return (
    <>
      <div
        className="fixed z-50 flex flex-col rounded border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        style={{
          top: position.y,
          left: position.x,
          width: size.width,
          height: size.height,
          position: "fixed"
        }}
      >
        <div
          className="flex shrink-0 cursor-move items-center border-b border-gray-300 bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-800"
          onMouseDown={handleMouseDown}
        >
          {headerContent}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{mainContent}</div>

        {/* Resize handles */}
        <div
          className="absolute inset-y-0 right-0 w-2 cursor-e-resize hover:bg-gray-300/20"
          onMouseDown={e => handleResizeMouseDown(e, "e")}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-2 cursor-s-resize hover:bg-gray-300/20"
          onMouseDown={e => handleResizeMouseDown(e, "s")}
        />
        <div
          className="absolute bottom-0 right-0 size-4 cursor-se-resize hover:bg-gray-300/20"
          onMouseDown={e => handleResizeMouseDown(e, "se")}
        />
      </div>

      <Dialog open={showContextDialog} onOpenChange={setShowContextDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Current Context</DialogTitle>
            <DialogDescription>
              This is the current context being used by the AI assistant.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={`context: ${context}
                  idMappings: ${JSON.stringify(idMappings, null, 2)}
              `}
              readOnly
              className="h-[400px] font-mono text-sm"
            />
          </div>
        </DialogContent>
      </Dialog>

      <RealtimeMessagesWindow 
        isOpen={isSessionActive && showRealtimeMessages}
        onClose={() => setShowRealtimeMessages(false)} 
      />
    </>
  )
}
