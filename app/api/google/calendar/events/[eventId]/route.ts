import { NextResponse } from "next/server"
import { google } from "googleapis"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { cookies } from "next/headers"

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

async function refreshAndUpdateTokens(userId: string, tokens: any) {
  oauth2Client.setCredentials(tokens)
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken()
    
    // Update tokens in Firestore
    const db = getFirestore()
    await db.collection("users").doc(userId).update({
      'googleCalendar.tokens': credentials
    })
    
    return credentials
  } catch (error) {
    console.error("Failed to refresh tokens:", error)
    throw new Error("Failed to refresh Google Calendar access")
  }
}

export async function PATCH(
  request: Request,
  context: { params: { eventId: string } }
) {
  try {
    const { eventId } = await context.params
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current user's session
    const session = await getAuth().verifySessionCookie(sessionCookie)

    // Get user's Google Calendar tokens
    const db = getFirestore()
    const userDoc = await db.collection("users").doc(session.uid).get()

    const userData = userDoc.data()
    let tokens = userData?.googleCalendar?.tokens

    if (!tokens) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      )
    }

    // Try to refresh tokens before making the calendar request
    try {
      tokens = await refreshAndUpdateTokens(session.uid, tokens)
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to refresh Google Calendar access" },
        { status: 401 }
      )
    }

    // Get update data from request
    const updates = await request.json()

    // Set up Google Calendar client with refreshed tokens
    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Get the current event to preserve any fields we're not updating
    const currentEvent = await calendar.events.get({
      calendarId: "primary",
      eventId
    })

    // Prepare the update payload
    const updatePayload: any = {
      ...currentEvent.data,
      summary: updates.title || currentEvent.data.summary,
      description: updates.description || currentEvent.data.description
    }

    // Handle start/end time updates
    if (updates.startTime) {
      updatePayload.start = {
        dateTime: updates.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }
    if (updates.endTime) {
      updatePayload.end = {
        dateTime: updates.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }

    // Update the event
    await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: updatePayload
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update Google Calendar event:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: { eventId: string } }
) {
  try {
    const { eventId } = await context.params
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current user's session
    const session = await getAuth().verifySessionCookie(sessionCookie)

    // Get user's Google Calendar tokens
    const db = getFirestore()
    const userDoc = await db.collection("users").doc(session.uid).get()

    const userData = userDoc.data()
    let tokens = userData?.googleCalendar?.tokens

    if (!tokens) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      )
    }

    // Try to refresh tokens before making the calendar request
    try {
      tokens = await refreshAndUpdateTokens(session.uid, tokens)
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to refresh Google Calendar access" },
        { status: 401 }
      )
    }

    // Set up Google Calendar client with refreshed tokens
    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Delete the event
    await calendar.events.delete({
      calendarId: "primary",
      eventId
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete Google Calendar event:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
