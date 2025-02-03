import EventEmitter from "events"
import { ActionPlanItem } from "./agent-types"
import { FunctionCallArgs } from "@/types/function-call-types"
import { processCall } from "../function-call-processor"
import { FunctionCallName } from "@/types/function-call-types"

  export class PlanAgent extends EventEmitter {
    
    /**
     * Calls the external gather endpoint to retrieve additional information.
     * Then, if the returned message contains tool calls, processes them and returns results.
     *
     * @param currentContext The current context string.
     * @param todoList       The list of todo items.
     * @returns A promise resolving to a string with the new aggregated information.
     */

    public async buildPlan(currentContext: string, todoList: Record<string, boolean>): Promise<ActionPlanItem[]> {
      this.emit("planBuildStart", { context: currentContext, todo: todoList });
  
      try {
        // Call the external API route
        const response = await fetch("/api/agent/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: currentContext, todo_list: Object.entries(todoList).map(([task, done]) => ({ task, done: done ? "true" : "false" })).filter(({ done }) => !done).map(({ task }) => task) })
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          this.emit("gatherError", { error: errorText });
          throw new Error(`GatherAgent error: ${errorText}`);
        }
  
        const data = await response.json();
        const message = data.message;
  
        // If there are tool calls, map them to ActionPlanItems
        let planItems: ActionPlanItem[] = []
        if (message.tool_calls && message.tool_calls.length > 0) {
          planItems = message.tool_calls.map((call: any) => ({
            name: call.function.name,
            parameters: call.function.arguments
          }));
        }
  
        this.emit("planBuildComplete", { plan: planItems });
        return planItems;
      } catch (error) {
        this.emit("gatherError", { error });
        throw error;
      }
    }
  }
  