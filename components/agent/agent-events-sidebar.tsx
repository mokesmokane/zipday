"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useWorkflow } from "@/lib/context/agent-workflow-context"
import { AgentEventPayload } from "@/lib/agents/agent-types"
import { Bot, Brain, CheckCircle, Circle, Clock, FileSearch, List, ChevronRight, X, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface EventItem {
  id: string
  type: string
  timestamp: Date
  payload: AgentEventPayload
}

export function AgentEventsSidebar() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const { state, getCoordinator, stopWorkflow } = useWorkflow()
  const {
    stage,
    todo_list,
    context,
    currentMessage,
    error
  } = state

  useEffect(() => {
    const coordinator = getCoordinator()
    if (!coordinator) return

    const eventTypes = [
      "roundStart",
      "phaseDecision",
      "gatherStart",
      "gatherComplete",
      "planBuildStart",
      "planBuildComplete",
      "executeStart",
      "executeComplete",
      "finished",
      "error"
    ]

    const handlers = eventTypes.map(type => ({
      type,
      handler: (payload: AgentEventPayload) => {
        setEvents(prev => [...prev, {
          id: Math.random().toString(36).slice(2),
          type,
          timestamp: new Date(),
          payload
        }])
        
      }
    }))

    // Add event listeners
    handlers.forEach(({ type, handler }) => {
      coordinator.on(type, handler)
    })

    // Cleanup
    return () => {
      handlers.forEach(({ type, handler }) => {
        coordinator.off(type, handler)
      })
    }
  }, [getCoordinator])

  const getEventIcon = (type: string) => {
    switch (type) {
      case "roundStart":
        return <Clock className="size-4" />
      case "phaseDecision":
        return <Brain className="size-4" />
      case "gatherStart":
      case "gatherComplete":
        return <FileSearch className="size-4" />
      case "planBuildStart":
      case "planBuildComplete":
        return <List className="size-4" />
      case "executeStart":
      case "executeComplete":
        return <Bot className="size-4" />
      case "finished":
        return <CheckCircle className="size-4" />
      case "error":
        return <Circle className="size-4" />
      default:
        return <Circle className="size-4" />
    }
  }

  const formatEventMessage = (event: EventItem) => {
    const { type, payload } = event
    switch (type) {
      case "roundStart":
        return `Round ${payload.round} started`
      case "phaseDecision":
        return `Decided to ${payload.decision}`
      case "gatherStart":
        return "Started gathering information"
      case "gatherComplete":
        return "Completed gathering information"
      case "planBuildStart":
        return "Started building plan"
      case "planBuildComplete":
        return "Completed building plan"
      case "executeStart":
        return "Started executing plan"
      case "executeComplete":
        return "Completed executing plan"
      case "finished":
        return "Workflow completed"
      case "error":
        return `Error: ${payload.error?.message || "Unknown error"}`
      default:
        return type
    }
  }

  const getEventDetails = (event: EventItem) => {
    const { type, payload } = event
    switch (type) {
      case "roundStart":
        return (
          <div className="space-y-4">
            <div>
              <div className="font-medium">Round</div>
              <div className="text-sm text-muted-foreground">{payload.round}</div>
            </div>
            {payload.todo && (
              <div>
                <div className="font-medium">Todo List</div>
                <div className="space-y-1">
                  {Object.entries(payload.todo).map(([task, done]) => (
                    <div key={task} className="flex items-center gap-2 text-sm">
                      <div className={cn(
                        "size-2 rounded-full",
                        done ? "bg-green-500" : "bg-yellow-500"
                      )} />
                      {task}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      case "phaseDecision":
        return (
          <div>
            <div className="font-medium">Decision</div>
            <div className="text-sm text-muted-foreground">{payload.decision}</div>
          </div>
        )
      case "gatherComplete":
        return (
          <div>
            <div className="font-medium">New Information</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{payload.newInfo}</div>
          </div>
        )
      case "planBuildComplete":
        return (
          <div>
            <div className="font-medium">Action Plan</div>
            <div className="space-y-2">
              {payload.plan?.map((item, index) => (
                <div key={index} className="text-sm">
                  <div className="font-medium">{item.name}</div>
                  {item.parameters && (
                    <pre className="mt-1 text-xs text-muted-foreground">
                      {JSON.stringify(item.parameters, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      case "executeComplete":
        return (
          <div>
            <div className="font-medium">Execution Results</div>
            <div className="space-y-2">
              {payload.executionResults && Object.entries(payload.executionResults).map(([name, result]) => (
                <div key={name} className="text-sm">
                  <div className="font-medium">{name}</div>
                  <div className="text-muted-foreground">
                    {typeof result === 'string' ? result : JSON.stringify(result)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case "error":
        return (
          <div>
            <div className="font-medium">Error</div>
            <div className="text-sm text-destructive">{payload.error?.message}</div>
          </div>
        )
      default:
        return null
    }
  }

  const groupEventsByRound = (events: EventItem[]) => {
    return events.reduce((acc, event) => {
      const round = event.payload.round || 1  // Default to round 1 if undefined
      const currentGroup = acc.find(g => g.round === round)
      
      if (currentGroup) {
        currentGroup.events.push(event)
      } else {
        acc.push({ round, events: [event] })
      }
      
      return acc
    }, [] as { round: number; events: EventItem[] }[])
  }

  const isActiveRound = (roundNumber: number) => {
    return !events.some(e => e.type === "roundStart" && e.payload.round !== undefined && e.payload.round > roundNumber)
  }

  if (events.length === 0) return null

  const groupedEvents = groupEventsByRound(events)

  return (
    <>
      <div className="w-80 border-l bg-background">
        <div className="flex items-center justify-between p-4 font-semibold border-b">
          <div className="flex items-center gap-2">
            <Bot className="size-5" />
            Agent Events
          </div>
          <Button variant="ghost" size="icon" onClick={() => stopWorkflow()}>
            <X className="size-5" />
          </Button>
        </div>

        {Object.keys(todo_list).length > 0 && (
          <div className="border-b">
            <div className="p-4">
              <div className="font-medium mb-2">Todo List</div>
              <div className="space-y-2">
                {Object.entries(todo_list).map(([task, done], index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 text-sm rounded-md p-2 border",
                        done && "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "size-5 rounded-full border flex items-center justify-center",
                      done && "border-primary bg-primary text-primary-foreground"
                    )}>
                      {done && <CheckCircle2 className="size-3" />}
                    </div>
                    <span className={cn(done && "line-through text-muted-foreground")}>
                      {task}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="space-y-6 p-4">
            {groupedEvents.map(({ round, events }) => (
              <div key={round} className="space-y-2">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">Round {round}</div>
                    {isActiveRound(round) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {stage === "running" && (
                            <>
                              <Bot className="size-4 animate-pulse" />
                              <span>Running</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative ml-4 space-y-4">
                  <div className="absolute left-2 top-0 h-full w-px bg-border" />
                  {events.filter(e => e.type !== "roundStart").map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "relative ml-6 rounded-lg border bg-card p-3 cursor-pointer transition-colors hover:bg-accent",
                        event.type === "error" && "border-destructive",
                        selectedEvent?.id === event.id && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="absolute -left-8 flex size-6 items-center justify-center rounded-full border bg-background">
                        {getEventIcon(event.type)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">
                            {formatEventMessage(event)}
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {event.timestamp.toLocaleTimeString()}
                        </div>
                        {(event.type === "executeComplete" || event.type === "gatherComplete") && event.payload.results && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <div className="font-medium">Results:</div>
                            <div className="whitespace-pre-wrap">{event.payload.results}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Sheet open={selectedEvent !== null} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="w-1/2 sm:max-w-[50%]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>{selectedEvent && formatEventMessage(selectedEvent)}</SheetTitle>
              
            </div>
          </SheetHeader>
          <div className="mt-4">
            {selectedEvent && getEventDetails(selectedEvent)}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
} 