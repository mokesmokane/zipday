"use client"

import { createContext, useContext, useState } from "react"
import type { FunctionCall } from "@/types/function-call-types"

export interface ITranscript {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export class Transcript implements ITranscript {
  constructor(
    public role: "user" | "assistant",
    public content: string,
    public timestamp: number
  ) {}
}

export type Message = Transcript | FunctionCall

interface RealtimeContext {
  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void
}

const RealtimeContext = createContext<RealtimeContext | null>(null)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message])
  }

  const clearMessages = () => {
    setMessages([])
  }

  return (
    <RealtimeContext.Provider value={{ messages, addMessage, clearMessages }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context)
    throw new Error("useRealtime must be used within RealtimeProvider")
  return context
}
