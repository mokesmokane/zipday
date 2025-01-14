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

export async function DELETE(
  request: Request,
  { params }: { params: { eventId: string } }
) {
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

    // Set up Google Calendar client
    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Delete the event
    await calendar.events.delete({
      calendarId: "primary",
      eventId: params.eventId
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