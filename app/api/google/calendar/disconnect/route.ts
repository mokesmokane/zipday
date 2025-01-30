import { NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current user's session
    const session = await getAuth().verifySessionCookie(sessionCookie)

    // Remove Google Calendar connection from user's document
    const db = getFirestore()
    await db.collection("users").doc(session.uid).update({
      "googleCalendar.connected": false,
      "googleCalendar.tokens": null
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to disconnect Google Calendar:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
