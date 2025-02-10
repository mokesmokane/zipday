"use client"

import { EventEmitter } from "events";
import { FunctionCallName, FunctionCallArgs } from "@/types/function-call-types";
import { executeCode, processCall } from "@/lib/function-call-processor";
import { createIdMapping, formatTasksContext, formatTasksContextForDayTasks } from "@/lib/utils/context-utils"
import { Task } from "@/types/daily-task-types"
import { AgentEventPayload } from "./agent-types";
/**
 * A GatherAgent that calls your existing /api/gather endpoint.
 * Uses EventEmitter for broadcasting status and directly processes function calls.
 */
export class ExecuteCodeAgent extends EventEmitter {
    /**
     * Calls the external gather endpoint to rtasketrieve additional information.
     * Then, if the returned message contains tool calls, processes them and returns results.
     *
     * @param currentContext The current context string.
     * @param todoList       The list of todo items.
     * @returns A promise resolving to a string with the new aggregated information.
     */
    public async executeCode(round: number, currentContext: string, todoList: Record<string, boolean>, mapping: Record<string, string>): Promise<{ newInfo: string, mapping: Record<string, string> }> {
        this.emit("executeCodeStart", { context: currentContext, todo: todoList, round });
        console.log("todoList", todoList)
        const x = Object.entries(todoList).map(([task, done]) => ({ task, done})).filter(({ done }) => !done).map(({ task }) => task)
        console.log("x", x)
        try {
            // Call the external API route
            const response = await fetch("/api/agent/write-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ context: currentContext, todo_list: x })
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.emit("executeCodeError", { error: errorText });
                throw new Error(`ExecuteCodeAgent error: ${errorText}`);
            }

            const data = await response.json();
            console.log("data", data)
            const { code, pseudoCode } = data;
            //emit the pseudo code and the code
            this.emit("pseudoCode", { pseudoCode, round } as AgentEventPayload);
            this.emit("code", { code, round } as AgentEventPayload);
            const result = await executeCode(code );
            console.log("result", result)
            this.emit("gatherComplete", { newInfo: result.message, mapping });
            return { newInfo: result.message, mapping };
        } catch (error) {
            this.emit("gatherError", { error });
            throw error;
        }
    }
}
