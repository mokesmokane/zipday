
export type AgentPhase = "gather" | "build_plan" | "execute"

export interface ActionPlanItem {
  name: string
  parameters?: any
  result?: any
}

export interface AgentEventPayload {
  round?: number
  context?: string
  todo?: Record<string, boolean>
  plan?: ActionPlanItem[]
  decision?: AgentPhase
  newInfo?: string
  executionResults?: { [actionName: string]: boolean }
  error?: Error
}