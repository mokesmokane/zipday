"use server"

import { auth, firestore } from "firebase-admin"
import { cookies } from "next/headers"
import { ActionState } from "@/types/server-action-types"
import { Day, Task } from "@/types/daily-task-types"
import { addDays, format } from "date-fns"

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

// Helper function to check if user has Google Calendar connected
async function isGoogleCalendarConnected(userId: string): Promise<boolean> {
  const userDoc = await db.collection("users").doc(userId).get()
  const userData = userDoc.data()
  return userData?.googleCalendar?.connected || false
}

// Helper function to sync with Google Calendar
async function syncWithGoogleCalendar(userId: string, task: Task, operation: 'create' | 'update' | 'delete') {
  try {
    // Only sync if user has Google Calendar connected
    if (await isGoogleCalendarConnected(userId)) {
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get("session")?.value
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}`
      
      await fetch(`${baseUrl}/api/google/calendar/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionCookie}`
        },
        body: JSON.stringify({ task, operation })
      })
    }
  } catch (error) {
    console.error('Failed to sync with Google Calendar:', error)
  }
}

/**
 * Retrieves all tasks for a given date range by reading daily docs
 * in userDays/{userId}/dailyTasks.
 */
export async function getDaysByDateRangeAction(
  startDate: string,
  endDate: string
): Promise<ActionState<Day[]>> {
  try {
    const userId = await getAuthenticatedUserId()

    const start = new Date(startDate)
    const end = new Date(endDate)
    const days: Day[] = []

    let currentDate = start
    while (currentDate <= end) {
      const dateDocId = format(currentDate, "yyyy-MM-dd")
      const docRef = db
        .collection("userDays")
        .doc(userId)
        .collection("dailyTasks")
        .doc(dateDocId)

      const snapshot = await docRef.get()
      if (snapshot.exists) {
        const data = snapshot.data()
        if (data) {
          const day: Day = {
            id: snapshot.id,
            createdAt: snapshot.createTime?.toDate().toISOString() || "",
            updatedAt: snapshot.updateTime?.toDate().toISOString() || "",
            date: dateDocId,
            tasks: data.tasks as Task[] || []
          }
          days.push(day)
        }
      }
      currentDate = addDays(currentDate, 1)
    }

    return {
      isSuccess: true,
      message: "Tasks retrieved successfully",
      data: days
    }
  } catch (error) {
    console.error("Error getting tasks by date range:", error)
    return { isSuccess: false, message: "Failed to get tasks by date range" }
  }
}

/**
 * Creates a single task in userDays/{userId}/dailyTasks/{dateDoc}.
 * If the daily doc doesn't exist, it is created. The tasks array is then updated.
 */
export async function addTaskAction(
  dateDoc: string,
  task: Task
): Promise<ActionState<Task>> {
  try {
    const userId = await getAuthenticatedUserId()
    
    const docRef = db
      .collection("userDays")
      .doc(userId)
      .collection("dailyTasks")
      .doc(dateDoc)

    const docSnap = await docRef.get()

    let tasks: Task[] = []
    if (docSnap.exists) {
      const dailyData = docSnap.data() as { tasks: Task[] }
      tasks = dailyData.tasks || []
    }

    tasks.push(task)
    await docRef.set({ tasks }, { merge: true })

    // Sync with Google Calendar
    if (task.calendarItem) {
      await syncWithGoogleCalendar(userId, task, 'create')
    }

    return {
      isSuccess: true,
      message: "Task created successfully",
      data: task
    }
  } catch (error) {
    console.error("Failed to create task:", error)
    return { isSuccess: false, message: "Failed to create task" }
  }
}

/**
 * Updates a single task in userDays/{userId}/dailyTasks/{dateDoc}.
 */
export async function updateTaskAction(
  dateDoc: string,
  taskId: string,
  updates: Partial<Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<ActionState<Task>> {
  try {
    const userId = await getAuthenticatedUserId()

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

    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) {
      return { isSuccess: false, message: "Task not found" }
    }

    const nowIso = new Date().toISOString()
    const oldTask = tasks[idx]
    const updatedTask = {
      ...oldTask,
      ...updates,
      updatedAt: nowIso
    }

    tasks[idx] = updatedTask
    await docRef.set({ tasks }, { merge: true })

    // Sync with Google Calendar
    await syncWithGoogleCalendar(userId, updatedTask, 'update')

    return {
      isSuccess: true,
      message: "Task updated successfully",
      data: updatedTask
    }
  } catch (error) {
    console.error("Error updating task:", error)
    return { isSuccess: false, message: "Failed to update task" }
  }
}

/**
 * Removes a single task from userDays/{userId}/dailyTasks/{dateDoc}.
 */
export async function deleteTaskAction(
  dateDoc: string,
  taskId: string
): Promise<ActionState<void>> {
  try {
    const userId = await getAuthenticatedUserId()

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

    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) {
      return { isSuccess: false, message: "Task not found" }
    }

    const taskToDelete = tasks[idx]
    tasks.splice(idx, 1)
    await docRef.set({ tasks }, { merge: true })

    // Sync with Google Calendar
    await syncWithGoogleCalendar(userId, taskToDelete, 'delete')

    return {
      isSuccess: true,
      message: "Task deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting task:", error)
    return { isSuccess: false, message: "Failed to delete task" }
  }
}