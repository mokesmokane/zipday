import { NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current user's session
    const session = await getAuth().verifySessionCookie(sessionCookie)

    // Check if user has Google Calendar connected
    const db = getFirestore()
    const userDoc = await db.collection("users").doc(session.uid).get()

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
