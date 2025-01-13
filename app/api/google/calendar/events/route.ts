import { NextResponse } from "next/server"
import { google } from "googleapis"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function GET() {
  try {
    // Get the current user's session
    const session = await getAuth().verifySessionCookie(
      // TODO: Get session cookie from request
      ""
    )

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user's Google Calendar tokens
    const db = getFirestore()
    const userDoc = await db
      .collection("users")
      .doc(session.uid)
      .get()

    const userData = userDoc.data()
    const tokens = userData?.googleCalendar?.tokens

    if (!tokens) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      )
    }

    // Set up Google Calendar client
    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Get events for the next 7 days
    const now = new Date()
    const oneWeekFromNow = new Date()
    oneWeekFromNow.setDate(now.getDate() + 7)

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: oneWeekFromNow.toISOString(),
      singleEvents: true,
      orderBy: "startTime"
    })

    // Transform events to our format
    const events = response.data.items?.map(event => ({
      id: event.id,
      title: event.summary || "Untitled Event",
      description: event.description,
      startTime: event.start?.dateTime || event.start?.date,
      endTime: event.end?.dateTime || event.end?.date,
      allDay: !event.start?.dateTime
    })) || []

    return NextResponse.json({ events })
  } catch (error) {
    console.error("Failed to fetch Google Calendar events:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 