import { EventEmitter } from "events"
import { ActionPlanItem } from "./agent-types"
import { processCall } from "@/lib/function-call-processor"
import { CheckResultsResponse, TodoResult } from "@/types/response-types"

export class ExecuteAgent extends EventEmitter {
    /**
     * Execute all actions in the plan.
     * Here we simulate a successful execution for every action.
     */
    public async execute(todoList: Record<string, boolean>, plan: ActionPlanItem[]): Promise<Record<string, boolean>> {
      this.emit("executeStart", { plan })
      
      const results: Record<string, string> = {}
      for (const action of plan) {
        const result = await processCall(action.name, action.parameters)
        results[action.name] = result
      }

      this.emit("executeComplete - check todo list", { executionResults: results })


      //we need to call the check-results endpoint here
      const checkResultsResponse = await fetch("/api/agent/check-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todo_list: Object.entries(todoList).map(([task, done]) => ({ task, done: done ? "true" : "false" })).filter(({ done }) => !done).map(({ task }) => task), execution_results: results })
      })

      const checkResultsData = await checkResultsResponse.json() as CheckResultsResponse

      this.emit("checkResultsResponse", { checkResultsResponse: checkResultsData })
      // Check if all tasks are done
      const allTasksDone = Object.values(todoList).every(done => done)
      if (allTasksDone) {
        this.emit("executeComplete - all tasks done", { allTasksDone })
      }

      const updatedTodoList = Object.fromEntries(
        checkResultsData.results.map(result => [result.task, result.result])
      ) as Record<string, boolean>
      return updatedTodoList
    }
  
    private delay(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }
  }