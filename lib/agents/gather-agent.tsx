"use client"

import { EventEmitter } from "events";
import { FunctionCallName, FunctionCallArgs } from "@/types/function-call-types";
import { processCall } from "@/lib/function-call-processor";
import { createIdMapping, formatTasksContext, formatTasksContextForDayTasks } from "@/lib/utils/context-utils"
import { Task } from "@/types/daily-task-types"
/**
 * A GatherAgent that calls your existing /api/gather endpoint.
 * Uses EventEmitter for broadcasting status and directly processes function calls.
 */
export class GatherAgent extends EventEmitter {
    /**
     * Calls the external gather endpoint to rtasketrieve additional information.
     * Then, if the returned message contains tool calls, processes them and returns results.
     *
     * @param currentContext The current context string.
     * @param todoList       The list of todo items.
     * @returns A promise resolving to a string with the new aggregated information.
     */
    public async gather(currentContext: string, todoList: Record<string, boolean>, mapping: Record<string, string>): Promise<{ newInfo: string, mapping: Record<string, string> }> {
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
                        if (toolCall.function.name === "get_calendar_for_date_range") {

                        } else if (toolCall.function.name === "get_incomplete_tasks" || toolCall.function.name === "get_future_tasks") {
                            if (result) {
                                const days: Record<string, Task[]> = result.data
                                for (const day of Object.values(days)) {
                                    const { mapping: newMapping } = createIdMapping(day, mapping)
                                    mapping = newMapping
                                }
                            }
                            const title = toolCall.function.name === "get_incomplete_tasks" ? "Incomplete Tasks" : "Future Tasks"
                            
                            aggregatedInfo += formatTasksContextForDayTasks(title, result.data, mapping)

                        }
                        else {

                            const { mapping: newMapping } = createIdMapping(result.data, mapping)
                            mapping = newMapping

                            if (result) {
                                aggregatedInfo += "\n\n" + formatTasksContext(result.message, result.data, mapping)
                            }
                        }
                    } catch (error) {

                        console.error(`Error processing function call`, toolCall.function.name);

                        this.emit("functionCallError", { error, functionCall: toolCall });
                    }
                }

                this.emit("functionCallsProcessed", { results: aggregatedInfo });
            }

            // Append any direct message content
            if (message.content) {
                aggregatedInfo += message.content;
            }

            this.emit("gatherComplete", { newInfo: aggregatedInfo, mapping });
            return { newInfo: aggregatedInfo, mapping };
        } catch (error) {
            this.emit("gatherError", { error });
            throw error;
        }
    }
}
