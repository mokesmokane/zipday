import { google } from "googleapis"
import { getFirestore } from "firebase-admin/firestore"

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function refreshGoogleTokens(userId: string) {
  const db = getFirestore()
  const userDoc = await db.collection("users").doc(userId).get()
  const tokens = userDoc.data()?.googleCalendar?.tokens

  if (!tokens?.refresh_token) {
    throw new Error("No refresh token available")
  }

  try {
    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token
    })

    const { credentials } = await oauth2Client.refreshAccessToken()
    
    // Update tokens in Firestore
    await db.collection("users").doc(userId).update({
      "googleCalendar.tokens": credentials
    })

    return credentials
  } catch (error) {
    console.error("Failed to refresh Google tokens:", error)
    throw error
  }
} 