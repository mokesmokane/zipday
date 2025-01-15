"use server"
import { auth, firestore } from "firebase-admin"
import { cookies } from "next/headers"
import { ActionState } from "@/types/server-action-types"
import { Task, CalendarItem } from "@/types/daily-task-types"

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