import { NextResponse } from "next/server"
import { google } from "googleapis"
import { getFirestore } from "firebase-admin/firestore"

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

// Get the base URL from environment variable or construct it
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}`

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state") // Contains user ID

    if (!code || !state) {
      return NextResponse.redirect("/dashboard?error=invalid_callback")
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Store tokens in user's document
    const db = getFirestore()
    await db
      .collection("users")
      .doc(state)
      .update({
        "googleCalendar.connected": true,
        "googleCalendar.tokens": tokens
      })

    // Redirect back to dashboard
    return NextResponse.redirect(`${baseUrl}/dashboard/todo`)
  } catch (error) {
    console.error("Failed to handle Google Calendar callback:", error)
    return NextResponse.redirect(`${baseUrl}/dashboard?error=calendar_connection_failed`)
  }
} 