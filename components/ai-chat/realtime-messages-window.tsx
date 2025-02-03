"use client"

import { useState, useRef, useEffect } from "react"
import { Minimize2, MessageCircle, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardTitle } from "@/components/ui/card"
import { Transcript, useRealtime } from "@/lib/context/transcription-context"
import { ActionCall, FunctionCall, QueryCall } from "@/types/function-call-types"
import { FunctionCallDisplay } from "@/components/ai-chat/function-call-display"
import { cn } from "@/lib/utils"

interface PopOutProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  title: string
  icon?: React.ReactNode
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
}

export function PopOut({
  children,
  isOpen,
  onClose,
  title,
  icon,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 400, height: 500 }
}: PopOutProps) {
  const [position, setPosition] = useState(defaultPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [size, setSize] = useState(defaultSize)
  const [isResizing, setIsResizing] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeDirection = useRef<string | null>(null)
  const initialSize = useRef({ width: 0, height: 0 })
  const initialPosition = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
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
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    } else {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }

    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove)
      window.addEventListener("mouseup", handleResizeUp)
    } else {
      window.removeEventListener("mousemove", handleResizeMove)
      window.removeEventListener("mouseup", handleResizeUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("mousemove", handleResizeMove)
      window.removeEventListener("mouseup", handleResizeUp)
    }
  }, [isDragging, isResizing])

  if (!isOpen) return null

  return (
    <div
      className="fixed z-50 flex flex-col rounded border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
      style={{
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height
      }}
    >
      <div
        className="flex shrink-0 cursor-move items-center border-b border-gray-300 bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-800"
        onMouseDown={handleMouseDown}
      >
        {icon}
        <CardTitle className="flex-1 text-sm font-medium ml-2">
          {title}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-7 opacity-50 hover:opacity-100"
        >
          <Minimize2 className="size-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>

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
  )
}

interface RealtimeMessagesWindowProps {
  isOpen: boolean
  onClose: () => void
}

export function RealtimeMessagesWindow({ isOpen, onClose }: RealtimeMessagesWindowProps) {
  const { messages } = useRealtime()

  return (
    <PopOut
      isOpen={isOpen}
      onClose={onClose}
      title="Realtime Messages"
      icon={<MessageCircle className="size-5" />}
    >
      <div className="flex flex-col gap-4 p-4">
        {messages.map((message, index) => {
          if (message instanceof ActionCall || message instanceof QueryCall) {
            return (
              <FunctionCallDisplay
                key={index}
                functionCall={message as ActionCall | QueryCall}
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
    </PopOut>
  )
} 