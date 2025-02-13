import { OpenAI } from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

// Define the function schema
const completionFunction = {
  name: 'provide_completions',
  description: 'Provides three different completions for the given text',
  parameters: {
    type: 'object',
    properties: {
      completions: {
        type: 'array',
        description: 'Array of three different completion suggestions',
        items: {
          type: 'string'
        },
        minItems: 3,
        maxItems: 3
      }
    },
    required: ['completions']
  }
}

export async function POST(req: Request) {
  // Get the authorization header from the request
  const authHeader = req.headers.get('authorization');
//   const isSubscribed = await verifySubscriptionStatus(authHeader || '');
//   if (!isSubscribed) {
//     return NextResponse.json(
//       createSubscriptionRequiredMessage(),
//       { status: 403 }
//     )
//   }

  try {
    const { current_task, context_tasks, completion_type, current_text }: { 
      current_task: string,
      context_tasks: string[],
      completion_type: string,
      current_text: string
    } = await req.json()

    const systemPrompt = `You are a daily planner assistant helping auto complete different sections of a task.

    A task looks something like this:
    Title
    - subtask
    - another subtask
    #category
    @9:30-11:00
    1h30m
    (title, subtasks, category, time, duration)

    You will be asked to help suggest completions for the ${completion_type}

    Provide exactly 3 different natural completions that are concise, make sense, and vary from each other.
    Only provide the completions, no explanations or numbering.
    They should be different from each other in tone and style, or length or seriousness.
    `
    const msgs = [
        {
            role: "system",
            content: systemPrompt
        },
        {
            role: "user",
            content: `Other tasks I have are: ${context_tasks.join(', ')}`
        },
        {
            role: "user",
            content: `The new task I'm creating currently looks like this: \n ${current_task}
            I am trying to complete the ${completion_type} section of the task.
            So far I have: "${current_text}"
            `
        },
        {
            role: "user",
            content: `I am trying to complete the ${completion_type} section of the task.
            So far I have: "${current_text}"
            `
        },
        {
            role: "user",
            content: `Please provide suggest 3 completions for the ${completion_type} section of the task.
            DO NOT INCLUDE THE ORIGINAL STRING AT THE START (${current_text}), your suggestions should IMMEDIATELY follow the original string.
            `
        }
    ] as ChatCompletionMessageParam[]
    console.log(msgs)   
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: msgs,
      functions: [completionFunction],
      function_call: { name: 'provide_completions' },
      temperature: 0.7
    })

    const functionResponse = completion.choices[0].message.function_call?.arguments
    if (!functionResponse) {
      throw new Error('No completion generated')
    }

    const { completions } = JSON.parse(functionResponse)
    
    return new Response(JSON.stringify({ completions }), {
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Error in completion:', error)
    return new Response('Error in completion', { status: 500 })
  }
} 