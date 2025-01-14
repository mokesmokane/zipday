import { NextResponse } from "next/server"
import { google } from "googleapis"
import { headers } from "next/headers"

// Keep track of active connections
const clients = new Set<ReadableStreamDefaultController>()

export async function GET() {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller)

      // Send initial message
      const data = encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      controller.enqueue(data)
    },
    cancel(controller) {
      clients.delete(controller)
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}

// Function to broadcast updates to all connected clients
export function broadcastCalendarUpdate(events: any[]) {
  const encoder = new TextEncoder()
  const data = encoder.encode(`data: ${JSON.stringify({ type: "update", events })}\n\n`)
  
  clients.forEach((client) => {
    try {
      client.enqueue(data)
    } catch (e) {
      console.error("Failed to send update to client:", e)
      clients.delete(client)
    }
  })
} 