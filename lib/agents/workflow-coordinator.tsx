"use client"

import { EventEmitter } from "events"
import { GatherAgent } from "./gather-agent"
import { PlanAgent } from "./plan-agent"
import { ExecuteAgent } from "./execute-agent"
import { ActionPlanItem, AgentPhase, AgentEventPayload } from "./agent-types"
import { DecideAgent } from "./decide-agent"
import { ExecuteCodeAgent } from "./execute-code-agent"
/**
 * The WorkflowCoordinator is the "conductor" of the round-based workflow.
 * It holds the global state (context, todo list, action plan, round count) and
 * delegates the "gather", "plan", and "execute" steps to the respective agents.
 */
export class WorkflowCoordinator extends EventEmitter {
  private context: string
  private todoList: Record<string, boolean>
  private actionPlan: ActionPlanItem[]
  private round: number = 0
  private results: string[] = []
  private gatherAgent: GatherAgent
  private planAgent: PlanAgent
  private executeAgent: ExecuteAgent
  private executeCodeAgent: ExecuteCodeAgent
  private decideAgent: DecideAgent
  private stopRequested: boolean = false
  private mapping: Record<string, string> = {}
  /**
   * @param initialContext A long string with initial information.
   * @param todoList       The list of tasks to be completed.
   * @param gatherAgent    Optional injection of a custom GatherAgent.
   * @param planAgent      Optional injection of a custom PlanAgent.
   * @param executeAgent   Optional injection of a custom ExecuteAgent.
   */

  constructor(
    initialContext: string,
    todoList: Record<string, boolean>,
    gatherAgent?: GatherAgent,
    planAgent?: PlanAgent,
    executeAgent?: ExecuteAgent,
    executeCodeAgent?: ExecuteCodeAgent,
    decideAgent?: DecideAgent
  ) {
    super()
    this.context = initialContext + "\n\n" + "Todays date is " + new Date().toISOString()
    this.todoList = todoList
    this.mapping = {}
    this.results = []
    this.actionPlan = []
    this.stopRequested = false
    // Allow dependency injection so you can swap implementations as needed.
    this.gatherAgent = gatherAgent || new GatherAgent()
    this.planAgent = planAgent || new PlanAgent()
    this.executeAgent = executeAgent || new ExecuteAgent()
    this.executeCodeAgent = executeCodeAgent || new ExecuteCodeAgent()
    this.decideAgent = decideAgent || new DecideAgent()
    // Forward agent events (optionally augmenting with round information).
    this.setupAgentEvents()
  }

  private setupAgentEvents() {
    this.gatherAgent.on("gatherStart", (payload) =>
      this.emit("gatherStart", { round: this.round, ...payload })
    )
    this.gatherAgent.on("gatherComplete", (payload) =>
      this.emit("gatherComplete", { round: this.round, ...payload })
    )
    this.planAgent.on("planBuildStart", (payload) =>
      this.emit("planBuildStart", { round: this.round, ...payload })
    )
    this.planAgent.on("planBuildComplete", (payload) =>
      this.emit("planBuildComplete", { round: this.round, ...payload })
    )
    this.executeAgent.on("executeStart", (payload) =>
      this.emit("executeStart", { round: this.round, ...payload })
    )
    this.executeAgent.on("executeComplete", (payload) =>
      this.emit("executeComplete", { round: this.round, ...payload })
    )
    
    // Add ExecuteCodeAgent event forwarding
    this.executeCodeAgent.on("executeCodeStart", (payload) =>
      this.emit("executeCodeStart", { round: this.round, ...payload })
    )
    this.executeCodeAgent.on("executeCodeError", (payload) =>
      this.emit("executeCodeError", { round: this.round, ...payload })
    )
    this.executeCodeAgent.on("pseudoCode", (payload) =>
      this.emit("pseudoCode", { round: this.round, ...payload })
    )
    this.executeCodeAgent.on("code", (payload) =>
      this.emit("code", { round: this.round, ...payload })
    )
  }

  /**
   * Returns true if every todo item has been marked as done.
   */
  private isFinished(): boolean {
    return Object.values(this.todoList).every((task) => task) || this.stopRequested
  }

  /**
   * Appends new information into the current context.
   */
  private updateContext(newInfo: string) {
    this.context += newInfo
  }

  private updateMapping(mapping: Record<string, string>) {
    this.mapping = mapping
  }

  /**
   * Uses the results from executing the plan to update the todo list.
   * (In this example, if all actions succeed, we mark each todo as done.)
   */
  private updateTodoList(executionResults: { [actionName: string]: boolean }): void {
    const allDone = Object.values(executionResults).every((result) => result)
    if (allDone) {
      this.todoList = Object.fromEntries(
        Object.entries(this.todoList).map(([task, done]) => [task, done || true])
      )
    }
  }


  /**
   * Runs the workflow until all todo items are completed.
   *
   * In each round:
   *  1. Emit a roundStart event.
   *  2. Decide which phase to run (gather, build_plan, or execute).
   *  3. Delegate to the corresponding agent.
   *  4. Update state and emit a roundEnd event.
   *
   * When finished, emit a finished event.
   */
  public async run(): Promise<void> {
    while (!this.isFinished() && !this.stopRequested) {
      this.round++

      // Emit roundStart at the beginning of each round
      this.emit("roundStart", {
        round: this.round,
        context: this.context,
        todo: this.todoList,
        plan: this.actionPlan,
        results: this.results.join("\n")
      } as AgentEventPayload)

      console.log("Results:", this.results.join("\n"))
      console.log("Context:", this.context)
      console.log("Todo List:", this.todoList)
      console.log("Action Plan:", this.actionPlan)
      console.log("Round:", this.round)
      
      // Set up the event listener before calling decide
      const decideCompletePromise = new Promise<{ decision: AgentPhase, reason: string }>(resolve => {
        this.decideAgent.once("decideComplete", (payload) => {
          resolve({ decision: payload.decision, reason: payload.reason }) 
        })
      })
      
      // Call decide after setting up the listener
      // const decideResponse = await this.decideAgent.decide(this.todoList, this.actionPlan, this.context, this.results.join("\n"))
      // const decideComplete = await decideCompletePromise
      const decideComplete = { decision: "execute_code", reason: "test" }
      
      // Emit phase decision
      this.emit("phaseDecision", { 
        round: this.round, 
        decision: decideComplete.decision, 
        reason: decideComplete.reason,
        todo: this.todoList,
        context: this.context
      } as AgentEventPayload)

      try {
        if (decideComplete.decision === "gather") {
          const {newInfo, mapping} = await this.gatherAgent.gather(this.context, this.todoList, {})
          this.updateContext(newInfo)
          this.updateMapping(mapping)
        } else if (decideComplete.decision === "build_plan") {
          const plan = await this.planAgent.buildPlan(this.context, this.todoList)
          this.actionPlan = plan
        } else if (decideComplete.decision === "execute_code") {
          const executionResults = await this.executeCodeAgent.executeCode(this.round, this.context, this.todoList, this.mapping)
          this.stop()     // Optionally clear the plan once executed.
          this.actionPlan = []
        } else if (decideComplete.decision === "execute") {
          const executionResults = await this.executeAgent.execute(this.todoList, this.actionPlan, this.mapping, this.round)
          this.updateTodoList(executionResults)
          // Optionally clear the plan once executed.
          this.actionPlan = []
        }
      } catch (error) {
        this.emit("error", { 
          round: this.round, 
          error,
          todo: this.todoList,
          context: this.context
        } as AgentEventPayload)
        // In production you might choose to handle or log errors and continue.
        throw error
      }

      // Emit roundEnd with updated state
      this.emit("roundEnd", {
        round: this.round,
        context: this.context,
        todo: this.todoList,
        plan: this.actionPlan
      } as AgentEventPayload)
    }

    // Emit finished with final state
    this.emit("finished", {
      round: this.round,
      context: this.context,
      todo: this.todoList,
      plan: this.actionPlan
    } as AgentEventPayload)
  }

  public stop() {
    this.emit("STOP", {
        round: this.round,
        context: this.context,
        todo: this.todoList,
        plan: this.actionPlan
      } as AgentEventPayload)    
      this.stopRequested = true

  }
}