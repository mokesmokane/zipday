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

export async function GET(request: Request) {
  try {
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

    // Get events for the current month
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    )

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfMonth.toISOString(),
      timeMax: endOfMonth.toISOString(),
      singleEvents: true,
      orderBy: "startTime"
    })

    const events =
      response.data.items?.map(event => {
        const isAllDay = !event.start?.dateTime
        return {
          id: event.id,
          title: event.summary || "Untitled Event",
          description: event.description,
          calendarItem: {
            gcalEventId: event.id,
            start: {
              dateTime: isAllDay
                ? `${event.start?.date}T00:00:00`
                : event.start?.dateTime
            },
            end: {
              dateTime: isAllDay
                ? `${event.end?.date}T23:59:59`
                : event.end?.dateTime
            }
          },
          allDay: isAllDay
        }
      }) || []

    return NextResponse.json({ events })
  } catch (error) {
    console.error("Failed to fetch Google Calendar events:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
