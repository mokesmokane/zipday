export type AgentPhase = "gather" | "build_plan" | "execute" | "execute_code"

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
  pseudoCode?: string
  code?: string
  decision?: AgentPhase
  reason?: string
  newInfo?: string
  executionResults?: { [actionName: string]: boolean }
  error?: Error
  results?: string
}