import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // Get instructions from query params
    const { searchParams } = new URL(request.url)
    const instructions = searchParams.get('instructions')

    const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        input_audio_transcription: {
            model: "whisper-1"
        },
        tools: [{
          type: "function",
          name: "update_plan",
          description: "Use this to note down tasks that need to be completed after the call. Call this when you have gathered enough information about what needs to be done. you can call this multiple times if you need to update the plan.",
          parameters: {
            type: "object",
            properties: {
              final: {
                type: "boolean",
                description: "Whether this is the final plan or not - if true, the call will be ended after this function call"
              },
              tasks: {
                type: "array",
                description: "List of tasks that need to be completed - these are tasks you are going to do after the call",
                items: {
                  type: "string",
                  description: "Description of the task to be completed"
                }
              }
            },
            required: ["tasks"]
          }
        },
        {
          type: "function",
          name: "hang_up",
          description: "Use this to end the call when the conversation has reached a natural conclusion or all necessary information has been gathered.",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "Brief explanation of why the call is being ended"
              }
            },
            required: ["reason"]
          }
        }],
        // Only include instructions if provided
        ...(instructions && { instructions })
      })
    })

    if (!res.ok) {
      console.error("Failed to create realtime session:", await res.text())
      return NextResponse.json(
        { error: "Failed to create realtime session" },
        { status: 500 }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching realtime token:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
