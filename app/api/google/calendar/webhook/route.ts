import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { google } from "googleapis"
import { broadcastCalendarUpdate } from "../stream/route"
import { getFirestore } from "firebase-admin/firestore"

// Verify the webhook is from Google
async function isValidWebhook(req: Request) {
  const headersList = await headers()
  const channelId = headersList.get("x-goog-channel-id")
  const resourceId = headersList.get("x-goog-resource-id")
  const state = headersList.get("x-goog-resource-state")
  const token = headersList.get("x-goog-channel-token")
  
  console.log("Webhook headers:", {
    channelId,
    resourceId,
    state,
    token
  })
  
  return (
    channelId && 
    resourceId && 
    state && 
    token === process.env.GOOGLE_WEBHOOK_TOKEN
  )
}

// Fetch latest events with auth
async function fetchLatestEvents(userId: string) {
  console.log("Fetching latest events...")
  
  // Get user's tokens
  const db = getFirestore()
  const userDoc = await db.collection("users").doc(userId).get()
  const tokens = userDoc.data()?.googleCalendar?.tokens

  if (!tokens) {
    throw new Error("No Google Calendar tokens found")
  }

  // Set up authenticated client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  oauth2Client.setCredentials(tokens)
  
  const calendar = google.calendar({ version: "v3", auth: oauth2Client })
  const now = new Date()
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime"
    })

    const events = response.data.items?.map(event => ({
      id: event.id,
      title: event.summary,
      description: event.description,
      startTime: event.start?.dateTime || event.start?.date,
      endTime: event.end?.dateTime || event.end?.date,
      allDay: !event.start?.dateTime
    })) || []

    console.log("Fetched events:", events)
    return events
  } catch (error) {
    console.error("Error fetching events:", error)
    throw error
  }
}

export async function POST(req: Request) {
  console.log("Received webhook notification")
  
  try {
    // Verify webhook is from Google
    if (!isValidWebhook(req)) {
      console.log("Invalid webhook request")
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const headersList = await headers()
    const state = headersList.get("x-goog-resource-state")
    const channelId = headersList.get("x-goog-channel-id")
    console.log("Webhook state:", state)

    // Get user ID from channel ID (stored in Firestore)
    const db = getFirestore()
    const webhookQuery = await db
      .collectionGroup("users")
      .where("googleCalendar.webhook.channelId", "==", channelId)
      .limit(1)
      .get()

    if (webhookQuery.empty) {
      console.log("No user found for channel ID:", channelId)
      return new NextResponse("Not Found", { status: 404 })
    }

    const userId = webhookQuery.docs[0].id

    // Handle different notification types
    switch (state) {
      case "sync":
        console.log("Initial sync complete")
        break
      case "exists":
      case "update":
        console.log("Calendar update received")
        const events = await fetchLatestEvents(userId)
        console.log("Broadcasting update to clients")
        broadcastCalendarUpdate(events)
        break
      case "not_exists":
        console.log("Resource deleted")
        const updatedEvents = await fetchLatestEvents(userId)
        broadcastCalendarUpdate(updatedEvents)
        break
    }

    // Acknowledge receipt
    return new NextResponse("OK", { status: 200 })
  } catch (error) {
    console.error("Error handling webhook:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 