import { TodoResult } from "@/types/response-types"
import { DecideResponse } from "@/types/response-types"
import { OpenAI } from "openai"
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionTool } from "openai/resources/chat/completions"

const client = new OpenAI()

//function def for check results
const markResultsFunctionDef: ChatCompletionTool = 
{
  type: "function",
  function: {
      name: "decide",
      description: "Decide what needs to be done to continue the workflow",
      parameters: {
      type: "object",
      properties: { 
        phase: { 
          type: "string", 
          enum: ["gather", "build_plan", "execute"],
          description: "Gather information, build a plan to act on existing information, or execute the plan"
        },
        reason: {
          type: "string",
          description: "The reason for the decision and a brief description of what will be done"
        }
      },
      required: ["phase", "reason"],
      additionalProperties: false
    }
  }
}

// Build system prompt for gathering stage
function buildDecideSystemPrompt(todo_list: string[], context: string, plan: string[], results?: string): string {
  let prompt = `You are part of a team that help a user manage their time and tasks.
  You should have access to the user's calendar, tasks, and notes.
  In this context you are deciding the next stage of a workflow.

  The list of tasks to be completed by your team is:
  ${todo_list.map(item => `- ${item}`).join("\n")}

${context !== '' ? `The context/information available to help complete those tasks is as follows:
  ${context}
` : 'NO CONTEXT/INFORMATION'}
}

${plan.length > 0 ? `The plan that has been generated to complete those tasks given that context is
  ${plan.map(item => `- ${item}`).join("\n")}
` : ' NO PLAN YET'}

${results !== '' ? `The results of the previous phase are:
  ${results}
` : ''}

  Decide the next phase of the workflow.
  gather: if there isnt enough information
  build_plan: if there are no steps in the plan, but there appears to be enough information to build a plan
  execute: if there is a plan that can be executed
  `

  return prompt
}

export async function POST(req: Request) {
  try {
    console.log("Decide endpoint called")
    const x = await req.json()
    console.log("Request:", x)
    const { context, todo_list, plan, results } = x

    if (!todo_list || !Array.isArray(todo_list) || !plan || !Array.isArray(plan)) {
      return Response.json({
        decision: undefined,
        success: false,
        message: "Missing or invalid required fields: todo_list and plan must be arrays"
      } as DecideResponse, { status: 400 })
    }

    // Ensure context is at least an empty string if undefined
    const safeContext = context ?? ''
    const safeResults = results ?? ''

    // First, get the assessment
    const assessmentRequest = {
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: buildDecideSystemPrompt(todo_list, safeContext, plan, safeResults)
        },
        {
          role: "user",
          content: `Please assess: 
            Do we have a detailed plan described to complete some of the tasks with enough information to do so?
            If not: Do we have enough context and visibility of user data to Create a plan?
            If not should we gather more information?`
        }
      ]
    }

    const assessmentCompletion = await client.chat.completions.create(assessmentRequest as ChatCompletionCreateParamsNonStreaming)
    const assessment = assessmentCompletion.choices[0].message.content

    // Then make the decision with the assessment included
    const decisionRequest = {
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: buildDecideSystemPrompt(todo_list, safeContext, plan, safeResults)
        },
        {
          role: "user",
          content: "Please assess: 1) Do we have a detailed enough plan with all the information needed to complete some of the tasks? 2) Do we have enough context and visibility of user data to create actionable steps?"
        },
        {
          role: "assistant",
          content: assessment
        },
        {
          role: "user",
          content: "Given your assessment, please decide the next phase of the workflow."
        }
      ], 
      tool_choice: "required",
      tools: [markResultsFunctionDef] as ChatCompletionTool[],
    }

    const completion = await client.chat.completions.create(decisionRequest as ChatCompletionCreateParamsNonStreaming)
    console.log("Completion:", completion)
    const toolCall = completion.choices[0].message.tool_calls?.[0]
    if (!toolCall) {
      return Response.json({
        decision: undefined,
        success: false,
        message: "No phase decision was made"
      } as DecideResponse, { status: 400 })
    }

    const parsedResults = JSON.parse(toolCall.function.arguments) as { phase: string, reason: string }  
    
    return Response.json({
      decision: parsedResults.phase,
      reason: parsedResults.reason,
      success: true,
      message: "Phase decision made successfully",
      assessment // Include the assessment in the response
    } as DecideResponse)

  } catch (error) {
    console.error("Error in decide endpoint:", error)
    return Response.json({
      decision: undefined,
      success: false,
      message: error instanceof Error ? error.message : "Failed to process request"
    } as DecideResponse, { status: 500 })
  }
} 