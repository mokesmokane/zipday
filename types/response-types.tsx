import { AgentPhase } from "@/lib/agents/agent-types"

// Add these types at the top of the file
export interface TodoResult {
    task: string
    reason: string
    result: boolean
  }
  
  export interface CheckResultsResponse {
    results: TodoResult[]
    success: boolean
    message: string
  }
  

  export interface DecideResponse {
    decision: AgentPhase | undefined
    message: string
    success: boolean
  }