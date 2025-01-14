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

export async function POST(request: Request) {
  try {
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current user's session
    const session = await getAuth().verifySessionCookie(sessionCookie)

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

    // Get task data from request
    const { task, operation } = await request.json()
    if (!task || !operation) {
      return NextResponse.json(
        { error: "Task and operation are required" },
        { status: 400 }
      )
    }

    // Set up Google Calendar client
    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Calculate end time based on duration
    const startTime = new Date(task.startTime)
    const endTime = new Date(startTime.getTime() + (task.durationMinutes * 60 * 1000))

    // Format event data
    const eventData = {
      summary: task.title,
      description: task.description || "",
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }

    let response

    switch (operation) {
      case "create":
      case "update":
        // If task has a gcalEventId, update it, otherwise create new
        if (task.gcalEventId) {
          response = await calendar.events.update({
            calendarId: "primary",
            eventId: task.gcalEventId,
            requestBody: eventData
          })
        } else {
          response = await calendar.events.insert({
            calendarId: "primary",
            requestBody: eventData
          })
        }
        break

      case "delete":
        if (task.gcalEventId) {
          response = await calendar.events.delete({
            calendarId: "primary",
            eventId: task.gcalEventId
          })
        }
        break

      default:
        return NextResponse.json(
          { error: "Invalid operation" },
          { status: 400 }
        )
    }

    return NextResponse.json({ 
      success: true,
      eventId: response?.data?.id
    })
  } catch (error) {
    console.error("Failed to sync with Google Calendar:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 