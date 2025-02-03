import { NextResponse } from "next/server"
import { getSelectedFunctionDefinitions } from "@/lib/function-calls"
import { FunctionCallName } from "@/types/function-call-types"

export async function GET(request: Request) {
  try {
    // Get instructions and selected functions from query params
    const { searchParams } = new URL(request.url)
    const instructions = searchParams.get("instructions")
    const selectedFunctionsParam = searchParams.get("selectedFunctions")
    const voice = searchParams.get("voice") || "alloy"

    // Parse selected functions
    let selectedFunctions: FunctionCallName[] = []
    if (selectedFunctionsParam) {
      try {
        selectedFunctions = JSON.parse(selectedFunctionsParam) as FunctionCallName[]
      } catch (error) {
        console.error("Error parsing selected functions:", error)
      }
    }

    const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice,
        input_audio_transcription: {
          model: "whisper-1"
        },
        tools: selectedFunctions.length > 0 
          ? getSelectedFunctionDefinitions(selectedFunctions)
          : [],
        tool_choice: "auto",
        turn_detection: {
          type: "server_vad",
          threshold: 1.0,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true
        },
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
