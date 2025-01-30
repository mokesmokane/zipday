import { NextResponse } from "next/server"
import { google } from "googleapis"
import { getFirestore } from "firebase-admin/firestore"

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

// Get the base URL from environment variable or construct it
const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}`

async function setupWebhook(auth: any) {
  // Skip webhook setup in development
  if (process.env.NODE_ENV === "development") {
    console.log("Development mode: Skipping webhook setup")
    return null
  }

  try {
    const calendar = google.calendar({ version: "v3", auth })

    // Set up push notifications
    const response = await calendar.events.watch({
      calendarId: "primary",
      requestBody: {
        id: Date.now().toString(), // Unique channel ID
        type: "web_hook",
        address: `${baseUrl}/api/google/calendar/webhook`,
        // Token to verify the notification is from Google
        token: process.env.GOOGLE_WEBHOOK_TOKEN,
        // Expire in 7 days (max allowed)
        expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
      }
    })

    return response.data
  } catch (error) {
    console.error("Failed to set up webhook:", error)
    throw error
  }
}

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
    // Ensure we have a refresh token
    if (!tokens.refresh_token) {
      throw new Error("No refresh token received from Google")
    }
    oauth2Client.setCredentials(tokens)

    // Set up webhook subscription (skipped in development)
    const webhookData = await setupWebhook(oauth2Client)

    // Store tokens and webhook data in user's document
    const db = getFirestore()
    await db
      .collection("users")
      .doc(state)
      .update({
        "googleCalendar.connected": true,
        "googleCalendar.tokens": tokens,
        ...(webhookData && {
          "googleCalendar.webhook": {
            channelId: webhookData.id,
            resourceId: webhookData.resourceId,
            expiration: webhookData.expiration
          }
        })
      })

    // Redirect back to dashboard
    return NextResponse.redirect(`${baseUrl}/dashboard/todo`)
  } catch (error) {
    console.error("Failed to handle Google Calendar callback:", error)
    return NextResponse.redirect(
      `${baseUrl}/dashboard?error=calendar_connection_failed`
    )
  }
}
