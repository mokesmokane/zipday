"use client"

import { EventEmitter } from "events";
import { FunctionCallName, FunctionCallArgs } from "@/types/function-call-types";
import { processCall } from "@/lib/function-call-processor";

/**
 * A GatherAgent that calls your existing /api/gather endpoint.
 * Uses EventEmitter for broadcasting status and directly processes function calls.
 */
export class GatherAgent extends EventEmitter {
  /**
   * Calls the external gather endpoint to retrieve additional information.
   * Then, if the returned message contains tool calls, processes them and returns results.
   *
   * @param currentContext The current context string.
   * @param todoList       The list of todo items.
   * @returns A promise resolving to a string with the new aggregated information.
   */
  public async gather(currentContext: string, todoList: Record<string, boolean>): Promise<string> {
    this.emit("gatherStart", { context: currentContext, todo: todoList });

    try {
      // Call the external API route
      const response = await fetch("/api/agent/gather", {
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
      let aggregatedInfo = "";

      // If there are tool calls, process them directly
      if (message.tool_calls && message.tool_calls.length > 0) {
        this.emit("toolCallsReceived", { toolCalls: message.tool_calls });
        
        // Process each tool call sequentially
        for (const toolCall of message.tool_calls) {
          try {
            const result = await processCall(
              toolCall.function.name as FunctionCallName,
              toolCall.function.arguments as FunctionCallArgs
            );
            
            if (result) {
              aggregatedInfo += typeof result === 'string' ? result : JSON.stringify(result);
              aggregatedInfo += "\n";
            }
          } catch (error) {
            console.error("Error processing function call:", error);
            this.emit("functionCallError", { error, functionCall: toolCall });
          }
        }
        
        this.emit("functionCallsProcessed", { results: aggregatedInfo });
      }

      // Append any direct message content
      if (message.content) {
        aggregatedInfo += message.content;
      }

      this.emit("gatherComplete", { newInfo: aggregatedInfo });
      return aggregatedInfo;
    } catch (error) {
      this.emit("gatherError", { error });
      throw error;
    }
  }
}
