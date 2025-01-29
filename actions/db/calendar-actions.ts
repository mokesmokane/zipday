"use server"
import { auth, firestore } from "firebase-admin"
import { cookies } from "next/headers"
import { ActionState } from "@/types/server-action-types"
import { Task, CalendarItem } from "@/types/daily-task-types"
import { GetCalendarForDateRangeArgs } from "@/types/function-call-types"
import { google } from "googleapis"
import { getAuth } from "firebase-admin/auth"

const db = firestore()

// Helper function to get authenticated user ID
async function getAuthenticatedUserId(): Promise<string> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session")?.value
  if (!sessionCookie) {
    throw new Error("No session cookie found")
  }
  const decodedClaims = await auth().verifySessionCookie(sessionCookie)
  return decodedClaims.uid
}

export async function updateCalendarItemAction(
  taskId: string,
  dateDoc: string,
  calendarItem: CalendarItem
): Promise<ActionState<void>> {
  try {
    const userId = await getAuthenticatedUserId()
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")?.value
    if (!sessionCookie) {
      throw new Error("No session cookie found")
    }
    // Update calendar item in Firestore
    const docRef = db
      .collection("userDays")
      .doc(userId)
      .collection("dailyTasks")
      .doc(dateDoc)

    const docSnap = await docRef.get()
    if (!docSnap.exists) {
      return { isSuccess: false, message: "Daily doc not found" }
    }

    const dailyData = docSnap.data() as { tasks: Task[] }
    const tasks = dailyData.tasks || []

    const taskIndex = tasks.findIndex(t => t.id === taskId)
    if (taskIndex === -1) {
      return { isSuccess: false, message: "Task not found" }
    }

    // Only update the calendarItem field
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      calendarItem
    }

    await docRef.set({ tasks }, { merge: true })

    // Sync with Google Calendar
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}`
    
    await fetch(`${baseUrl}/api/google/calendar/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionCookie}`
      },
      body: JSON.stringify({ 
        task: tasks[taskIndex],
        operation: calendarItem.gcalEventId ? 'update' : 'create'
      })
    })

    return {
      isSuccess: true,
      message: "Calendar item updated successfully"
    }

  } catch (error) {
    console.error("Failed to update calendar item:", error)
    return { isSuccess: false, message: "Failed to update calendar item" }
  }
}

export async function removeCalendarItemAction(
  taskId: string,
  dateDoc: string
): Promise<ActionState<void>> {
  try {
    const userId = await getAuthenticatedUserId()
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")?.value
    if (!sessionCookie) {
      throw new Error("No session cookie found")
    }
    const docRef = db
      .collection("userDays")
      .doc(userId)
      .collection("dailyTasks")
      .doc(dateDoc)

    const docSnap = await docRef.get()
    if (!docSnap.exists) {
      return { isSuccess: false, message: "Daily doc not found" }
    }

    const dailyData = docSnap.data() as { tasks: Task[] }
    const tasks = dailyData.tasks || []

    const taskIndex = tasks.findIndex(t => t.id === taskId)
    if (taskIndex === -1) {
      return { isSuccess: false, message: "Task not found" }
    }

    // Store gcalEventId before removing calendar item
    const gcalEventId = tasks[taskIndex].calendarItem?.gcalEventId

    // Remove calendar item
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      calendarItem: undefined
    }

    await docRef.set({ tasks }, { merge: true })

    // Delete from Google Calendar if it was synced
    if (gcalEventId) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}`
      
      await fetch(`${baseUrl}/api/google/calendar/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionCookie}`
        },
        body: JSON.stringify({ 
          task: { ...tasks[taskIndex], gcalEventId },
          operation: 'delete'
        })
      })
    }

    return {
      isSuccess: true,
      message: "Calendar item removed successfully"
    }

  } catch (error) {
    console.error("Failed to remove calendar item:", error)
    return { isSuccess: false, message: "Failed to remove calendar item" }
  }
}

export async function getCalendarForDateRange(args: GetCalendarForDateRangeArgs): Promise<ActionState<any>> {
  try {
    const { start_date, end_date } = args

    // Get user's Google Calendar tokens
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")?.value
    if (!sessionCookie) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    // Get the current user's session
    const session = await getAuth().verifySessionCookie(sessionCookie)

    // Get user's Google Calendar tokens from Firestore
    const userDoc = await db.collection("users").doc(session.uid).get()
    const userData = userDoc.data()
    const tokens = userData?.googleCalendar?.tokens

    if (!tokens) {
      return {
        isSuccess: false,
        message: "Google Calendar not connected"
      }
    }

    // Set up Google Calendar client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Get events from Google Calendar
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date(start_date).toISOString(),
      timeMax: new Date(end_date).toISOString(),
      singleEvents: true,
      orderBy: "startTime"
    })

    return {
      isSuccess: true,
      message: "Calendar events retrieved successfully",
      data: response.data.items
    }
  } catch (error) {
    console.error("Error getting calendar events:", error)
    return {
      isSuccess: false,
      message: "Failed to get calendar events"
    }
  }
} 