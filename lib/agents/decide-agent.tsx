import { EventEmitter } from "events"
import { ActionPlanItem, AgentPhase } from "./agent-types"
import { processCall } from "@/lib/function-call-processor"
import { DecideResponse } from "@/types/response-types"

export class DecideAgent extends EventEmitter {
    /**
     * Execute all actions in the plan.
     * Here we simulate a successful execution for every action.
     */
    public async decide(todoList: Record<string, boolean>, plan: ActionPlanItem[], context: string, results: string): Promise<AgentPhase | undefined> {
      this.emit("decideStart", { plan })
      

      //we need to call the check-results endpoint here
      const response = await fetch("/api/agent/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todo_list: Object.entries(todoList).map(([task, done]) => ({ task, done: done ? "true" : "false" })).filter(({ done }) => !done).map(({ task }) => task), execution_results: results, context })
      })

      const checkResultsResponse: DecideResponse = await response.json()
      
      if (checkResultsResponse.success) {
        this.emit("decideComplete", checkResultsResponse)
        return checkResultsResponse.decision || undefined

      } else {
        throw new Error(checkResultsResponse.message)
      }
      
    }
  }