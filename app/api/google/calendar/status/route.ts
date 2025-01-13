import { NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

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

    // Check if user has Google Calendar connected
    const db = getFirestore()
    const userDoc = await db
      .collection("users")
      .doc(session.uid)
      .get()

    const userData = userDoc.data()
    const hasGoogleCalendar = userData?.googleCalendar?.connected || false

    return NextResponse.json({ connected: hasGoogleCalendar })
  } catch (error) {
    console.error("Failed to check Google Calendar status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 