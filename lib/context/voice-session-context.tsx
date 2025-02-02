"use client"

import { createContext, useContext, useState } from "react"
import { FunctionCallName } from "@/types/function-call-types"
import { ContextType } from "@/lib/context/ai-context"

interface VoiceSessionContextType {
  voice: string
  setVoice: (voice: string) => void
  immediateExecution: boolean
  setImmediateExecution: (enabled: boolean) => void
  selectedFunctions: FunctionCallName[]
  setSelectedFunctions: (functions: FunctionCallName[]) => void
  isPlanMode: boolean
  setIsPlanMode: (enabled: boolean) => void
  isSessionActive: boolean
  setIsSessionActive: (active: boolean) => void
  getSessionInstructions: (context: string, contextType: ContextType) => string
}

const VoiceSessionContext = createContext<VoiceSessionContextType | undefined>(
  undefined
)

export function VoiceSessionProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [voice, setVoice] = useState("alloy")
  const [immediateExecution, setImmediateExecution] = useState(true)
  const [selectedFunctions, setSelectedFunctions] = useState<FunctionCallName[]>([
    "update_plan",
    "create_task",
    "move_task",
    "mark_tasks_completed",
    "get_calendar_for_date_range"
  ])
  const [isPlanMode, setIsPlanMode] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)

  const getDailyPlanningInstructions = (context: string) => {
    return `You are a highly efficient and professional personal assistant. Your role is to help your boss organize and prepare for their day in the most effective way possible.
    Here is their current schedule:
    ${context}
    Your primary goal is to package the day in a way that maximizes their efficiency, keeps them focused on what matters, and reduces their stress.
    They have ADHD so keep that in mind - though dont mention it.
    Its up to you to get all the information from them so that you can plan their day. You should drive the cadence of the conversation. Be as succint as possible

    Your main task is to respond to your bosses commands

    When generating your response, act as if you are making the first phone call of the day to your boss.

    If your boss doesnt give you a clear instruction you can follow this structured approach:

    1. Greeting and Energy Check:
    Start the call by warmly greeting your boss and assessing their mindset:

    Provide a positive and professional tone.
    2. Quick Overview of the Day:
    Summarize the key aspects of their schedule:

    3. Highlight the primary focus or theme of the day (e.g., critical meetings, deadlines, or decisions).
    Mention any major events or time-sensitive items.

    4. Alert them to anything they may have missed from yesterday - ask them if they want to reschedule them or mark them as complete.

    5. Follow-ups and Questions:
    Ensure you understand their needs:

    Ask if they have any additional focus areas or adjustments for the day.
    Reassure them of your support and readiness to handle any tasks or updates they need.

    Provide encouragement to set a confident tone for the day.
    Confirm check-in points or next steps.
    Constraints for Responses:
    Be as concise as possible.
    Proactive and Calm: Always offer solutions for potential challenges and avoid overwhelming them with unnecessary details.
    Adapt to the Boss's Personality: Adjust tone and suggestions based on the boss's known preferences or mood.
    Your responses should sound like you are speaking directly to your boss, focusing on clarity, efficiency, and professionalism.

    As you are speaking, you should be making notes about what you need to do after the call. The way you do this is by calling the update_plan function.

    The list of things on that plan is like a todo list - it high level but should have enough detail when in context to be actionable. You should be updating it as you go.

    Your boss is called Mokes

    DO NOT MAKE ANYTHING UP.
    YOU MUST ONLY USE THE INFORMATION PROVIDED.

    If your boss asks or commands you to do something ALWAYS UPDATE THE PLAN.`
  }

  const getTaskBoardInstructions = (context: string) => {
    return `You are a highly efficient and professional personal assistant. Your role is to help manage tasks and provide assistance throughout the day.
    Here is the current context:
    ${context}
    
    Your main task is to help manage and update tasks based on your boss's commands.
    Focus on organizing tasks, setting priorities, and maintaining the task board.
    
    Keep responses brief and focused on task management.
    
    Your boss is called Mokes.
    
    DO NOT MAKE ANYTHING UP.
    YOU MUST ONLY USE THE INFORMATION PROVIDED.
    
    If your boss asks or commands you to do something, always update the relevant tasks.`
  }

  const getCalendarInstructions = (context: string) => {
    return `You are a highly efficient and professional personal assistant. Your role is to help manage calendar events and scheduled tasks.
    Here is the current calendar context:
    ${context}
    
    Your main task is to help manage calendar events, schedule tasks, and handle time-based operations.
    Focus on time management, scheduling conflicts, and calendar organization.
    
    Keep responses brief and focused on calendar management.
    
    Your boss is called Mokes.
    
    DO NOT MAKE ANYTHING UP.
    YOU MUST ONLY USE THE INFORMATION PROVIDED.
    
    If your boss asks or commands you to do something related to scheduling or calendar management, always update the calendar accordingly.`
  }

  const getSessionInstructions = (context: string, contextType: ContextType) => {
    switch (contextType) {
      case ContextType.DAILY_PLANNER:
        return getDailyPlanningInstructions(context)
      case ContextType.TASK_BOARD:
        return getTaskBoardInstructions(context)
      case ContextType.CALENDAR:
        return getCalendarInstructions(context)
      default:
        return getTaskBoardInstructions(context)
    }
  }

  return (
    <VoiceSessionContext.Provider
      value={{
        voice,
        setVoice,
        immediateExecution,
        setImmediateExecution,
        selectedFunctions,
        setSelectedFunctions,
        isPlanMode,
        setIsPlanMode,
        isSessionActive,
        setIsSessionActive,
        getSessionInstructions
      }}
    >
      {children}
    </VoiceSessionContext.Provider>
  )
}

export function useVoiceSession() {
  const context = useContext(VoiceSessionContext)
  if (context === undefined) {
    throw new Error("useVoiceSession must be used within a VoiceSessionProvider")
  }
  return context
} 