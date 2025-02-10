// "use client"

// import { createContext, useContext, useState, ReactNode, useCallback } from "react"
// import { AgentEventPayload } from "@/lib/agents/agent-types"

// export const ALL_EVENT_TYPES = [
//   "roundStart",
//   "phaseDecision",
//   "roundEnd",
//   "gatherStart",
//   "gatherComplete",
//   "planBuildStart",
//   "planBuildComplete",
//   "executeStart",
//   "executeComplete",
//   "executeCodeStart",
//   "executeCodeError",
//   "pseudoCode",
//   "code",
//   "STOP",
//   "finished",
//   "error"
// ] as const

// export type EventType = typeof ALL_EVENT_TYPES[number]

// export interface EventItem {
//   id: string
//   type: EventType
//   timestamp: Date
//   payload: AgentEventPayload
// }

// interface AgentEventsContextType {
//   events: EventItem[]
//   addEvent: (type: EventType, payload: AgentEventPayload) => void
//   clearEvents: () => void
//   visibleEventTypes: Set<EventType>
//   toggleEventTypeVisibility: (type: EventType) => void
//   resetVisibleEventTypes: () => void
// }

// const AgentEventsContext = createContext<AgentEventsContextType | undefined>(undefined)

// export function AgentEventsProvider({ children }: { children: ReactNode }) {
//   const [events, setEvents] = useState<EventItem[]>([])
//   const [visibleEventTypes, setVisibleEventTypes] = useState<Set<EventType>>(new Set(ALL_EVENT_TYPES))

//   const addEvent = useCallback((type: EventType, payload: AgentEventPayload) => {
//     console.log("Adding event:", type, payload) // Debug log
//     setEvents(prev => [...prev, {
//       id: Math.random().toString(36).slice(2),
//       type,
//       timestamp: new Date(),
//       payload
//     }])
//   }, [])

//   const clearEvents = useCallback(() => {
//     setEvents([])
//   }, [])

//   const toggleEventTypeVisibility = useCallback((type: EventType) => {
//     setVisibleEventTypes(prev => {
//       const newSet = new Set(prev)
//       if (newSet.has(type)) {
//         newSet.delete(type)
//       } else {
//         newSet.add(type)
//       }
//       return newSet
//     })
//   }, [])

//   const resetVisibleEventTypes = useCallback(() => {
//     setVisibleEventTypes(new Set(ALL_EVENT_TYPES))
//   }, [])

//   return (
//     <AgentEventsContext.Provider
//       value={{
//         events,
//         addEvent,
//         clearEvents,
//         visibleEventTypes,
//         toggleEventTypeVisibility,
//         resetVisibleEventTypes
//       }}
//     >
//       {children}
//     </AgentEventsContext.Provider>
//   )
// }

// export function useAgentEvents() {
//   const context = useContext(AgentEventsContext)
//   if (context === undefined) {
//     throw new Error("useAgentEvents must be used within an AgentEventsProvider")
//   }
//   return context
// } 