"use server"

import { auth, firestore } from "firebase-admin"
import { cookies } from "next/headers"
import { ActionState } from "@/types/server-action-types"
import { CalendarItem, Day, Importance, Task, Urgency } from "@/types/daily-task-types"
import { addDays, format } from "date-fns"
import { CreateTaskArgs, MoveTaskArgs, MarkTasksCompletedArgs, MarkSubtaskCompletedArgs, CreateBacklogTaskArgs } from "@/types/function-call-types"

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
  task: Task,
  insertIndex?: number
): Promise<ActionState<Task>> {
  try {
    const userId = await getAuthenticatedUserId()
    console.log("Adding task:", task)
    const docRef = db
      .collection("userDays")
      .doc(userId)
      .collection("dailyTasks")
      .doc(dateDoc)
    console.log("Doc ref:", docRef)
    const docSnap = await docRef.get()
    console.log("Doc snap:", docSnap)

    let tasks: Task[] = []
    let day: Day | undefined = undefined
    if (docSnap.exists) {
      const dailyData = docSnap.data() as { tasks: Task[] }
      tasks = dailyData.tasks || []
      day = docSnap.data() as Day
    } else {
      console.log("Daily doc not found")
      day = {
        id: dateDoc,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: dateDoc,
        tasks: []
      }
    }
    console.log("Tasks:", tasks)
    // Add task to the end of the array to maintain order
    if (insertIndex !== undefined) {
      tasks.splice(insertIndex, 0, task)
    } else {
      tasks.push(task)
    }
    console.log("Tasks after adding:", tasks)

    day.tasks = tasks
    await docRef.set({ tasks }, { merge: true })
    console.log("Tasks after setting:", tasks)
    // Sync with Google Calendar
    if (task.calendarItem) {
      await syncWithGoogleCalendar(userId, task, 'create')
    }
    console.log("Task created successfully")
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


export async function markTasksCompletedAction(dateIds: Record<string, string[]>):  Promise<ActionState<void>> {
  try {
    const userId = await getAuthenticatedUserId()
    for (const date of Object.keys(dateIds)) { const docRef = db
      .collection("userDays")
      .doc(userId)
      .collection("dailyTasks")
      .doc(date)
      
      const docSnap = await docRef.get()
      if (!docSnap.exists) {
        return { isSuccess: false, message: "Daily doc not found" }
      }
      const day = docSnap.data() as Day
      const tasks = day.tasks || []

      const taskIds = dateIds[date]
      for (const taskId of taskIds) {
        const task = tasks.find((t: Task) => t.id === taskId)
        if (task) {
          task.completed = true
          await docRef.update({ tasks })
        }
      }
    }

    return {
      isSuccess: true,
      message: "Task marked as completed",
      data: undefined
    }
  } catch (error) {
    console.error("Error marking task as completed:", error)
    return {
      isSuccess: false,
      message: "Failed to mark task as completed"
    }
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

/**
 * Gets today's tasks by reading the daily doc for today's date.
 */
export async function getTodayAction(): Promise<ActionState<Day>> {
  try {
    const userId = await getAuthenticatedUserId()
    const today = format(new Date(), "yyyy-MM-dd")

    const docRef = db
      .collection("userDays")
      .doc(userId)
      .collection("dailyTasks")
      .doc(today)

    const snapshot = await docRef.get()
    const data = snapshot.data()

    const day: Day = {
      id: snapshot.id,
      createdAt: snapshot.createTime?.toDate().toISOString() || "",
      updatedAt: snapshot.updateTime?.toDate().toISOString() || "",
      date: today,
      tasks: data?.tasks as Task[] || []
    }

    return {
      isSuccess: true,
      message: "Today's tasks retrieved successfully",
      data: day
    }
  } catch (error) {
    console.error("Error getting today's tasks:", error)
    return { isSuccess: false, message: "Failed to get today's tasks" }
  }
}

/**
 * Gets tasks from the backlog collection.
 */
export async function getBacklogTasksAction(): Promise<ActionState<Task[]>> {
  try {
    console.log("Getting backlog tasks")
    const userId = await getAuthenticatedUserId()

    const docRef = db.collection("userBacklog").doc(userId)
    const doc = await docRef.get()
    
    if (!doc.exists) {
      // Initialize empty backlog if it doesn't exist
      await docRef.set({ tasks: [] })
      return {
        isSuccess: true,
        message: "Backlog tasks retrieved successfully",
        data: []
      }
    }

    const data = doc.data()
    const tasks = data?.tasks || []

    console.log("Backlog tasks:", tasks)

    return {
      isSuccess: true,
      message: "Backlog tasks retrieved successfully",
      data: tasks
    }
  } catch (error) {
    console.error("Error getting backlog tasks:", error)
    return { isSuccess: false, message: "Failed to get backlog tasks" }
  }
}

/**
 * Adds a task to the user's backlog collection.
 */
export async function addBacklogTaskAction(
  task: Task,
  insertIndex?: number
): Promise<ActionState<Task>> {
  try {
    const userId = await getAuthenticatedUserId()
    const docRef = db.collection("userBacklog").doc(userId)
    
    // Use a transaction to handle concurrent updates
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef)
      const now = new Date().toISOString()
      const taskWithTimestamps = {
        ...task,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        userId
      }

      if (!doc.exists) {
        // Initialize with first task if document doesn't exist
        transaction.set(docRef, {
          tasks: [taskWithTimestamps]
        })
      } else {
        // Get current tasks and insert new task at correct position
        const tasks = doc.data()?.tasks || []
        const updatedTasks = insertIndex !== undefined
          ? [...tasks.slice(0, insertIndex), taskWithTimestamps, ...tasks.slice(insertIndex)]
          : [...tasks, taskWithTimestamps]
        
        transaction.update(docRef, { tasks: updatedTasks })
      }

      return taskWithTimestamps
    })

    return {
      isSuccess: true,
      message: "Task added to backlog successfully",
      data: result
    }
  } catch (error) {
    console.error("Failed to add task to backlog:", error)
    return { isSuccess: false, message: "Failed to add task to backlog" }
  }
}

/**
 * Updates a task in the backlog collection.
 */
export async function updateBacklogTaskAction(
  taskId: string,
  updates: Partial<Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<ActionState<Task>> {
  try {
    const userId = await getAuthenticatedUserId()
    const now = new Date().toISOString()

    const docRef = db.collection("userBacklog").doc(userId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { isSuccess: false, message: "Backlog not found" }
    }

    const data = doc.data()
    const tasks = data?.tasks || []
    const taskIndex = tasks.findIndex((t: Task) => t.id === taskId)

    if (taskIndex === -1) {
      return { isSuccess: false, message: "Task not found in backlog" }
    }

    const updatedTask = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: now
    }

    tasks[taskIndex] = updatedTask

    await docRef.update({ tasks })

    return {
      isSuccess: true,
      message: "Backlog task updated successfully",
      data: updatedTask
    }
  } catch (error) {
    console.error("Error updating backlog task:", error)
    return { isSuccess: false, message: "Failed to update backlog task" }
  }
}

/**
 * Deletes a task from the backlog collection.
 */
export async function deleteBacklogTaskAction(taskId: string): Promise<ActionState<void>> {
  try {
    const userId = await getAuthenticatedUserId()
    
    const docRef = db.collection("userBacklog").doc(userId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { isSuccess: false, message: "Backlog not found" }
    }

    const data = doc.data()
    const tasks = data?.tasks || []
    const updatedTasks = tasks.filter((t: Task) => t.id !== taskId)

    await docRef.update({ tasks: updatedTasks })

    return {
      isSuccess: true,
      message: "Task deleted from backlog successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting backlog task:", error)
    return { isSuccess: false, message: "Failed to delete task from backlog" }
  }
}

/**
 * Reorders tasks in the backlog by updating their positions.
 */
export async function reorderBacklogTasksAction(
  taskIds: string[]
): Promise<ActionState<void>> {
  try {
    const userId = await getAuthenticatedUserId()
    
    const docRef = db.collection("userBacklog").doc(userId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { isSuccess: false, message: "Backlog not found" }
    }

    const data = doc.data()
    const currentTasks = data?.tasks || []
    
    // Create a map of tasks by ID for easy lookup
    const tasksMap = new Map(currentTasks.map((t: Task) => [t.id, t]))
    
    // Create new ordered array based on taskIds
    const orderedTasks = taskIds
      .map(id => tasksMap.get(id))
      .filter((t): t is Task => t !== undefined)

    await docRef.update({ tasks: orderedTasks })

    return {
      isSuccess: true,
      message: "Backlog tasks reordered successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error reordering backlog tasks:", error)
    return { isSuccess: false, message: "Failed to reorder backlog tasks" }
  }
}


export async function reorderDayTasksAction(
  dateDoc: string,
  taskIds: string[]
): Promise<ActionState<void>> {
  try {
    const userId = await getAuthenticatedUserId()
    
    const docRef = db.collection("userDays").doc(userId).collection("dailyTasks").doc(dateDoc)
  const doc = await docRef.get()

  if (!doc.exists) {
    return { isSuccess: false, message: "Daily doc not found" }
  }

    const data = doc.data()
  const currentTasks = data?.tasks || []
  
  // Create a map of tasks by ID for easy lookup
  const tasksMap = new Map(currentTasks.map((t: Task) => [t.id, t]))
  
  // Create new ordered array based on taskIds
  const orderedTasks = taskIds
    .map(id => tasksMap.get(id))
    .filter((t): t is Task => t !== undefined)

  await docRef.update({ tasks: orderedTasks })

  return {
    isSuccess: true,
    message: "Backlog tasks reordered successfully",
    data: undefined
  }
} catch (error) {
  console.error("Error reordering backlog tasks:", error)
    return { isSuccess: false, message: "Failed to reorder backlog tasks" }
  }
}


/**
 * Gets all incomplete tasks between a date range.
 */
export async function getIncompleteTasksAction(
  startDate: string,
  endDate: string
): Promise<ActionState<Record<string, Day>>> {
  try {
    const userId = await getAuthenticatedUserId()
    console.log("Getting incomplete tasks for date range:", startDate, endDate)
    // Get all documents in the date range by their IDs
    const snapshot = await db
      .collection("userDays")
      .doc(userId)
      .collection("dailyTasks")
      .orderBy(firestore.FieldPath.documentId())
      .startAt(startDate)
      .endBefore(endDate)
      .get()

    const incompleteTasks: Record<string, Day> = {} 
    
    for (const doc of snapshot.docs) {
      const data = doc.data()
      const tasks = data.tasks as Task[] || []
      incompleteTasks[doc.id] = {
        id: doc.id,
        date: doc.id,
        tasks: tasks.filter(t => !t.completed),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }
    }

    return {
      isSuccess: true,
      message: "Incomplete tasks retrieved successfully",
      data: incompleteTasks
    }
  } catch (error) {
    console.error("Error getting incomplete tasks:", error)
    return { isSuccess: false, message: "Failed to get incomplete tasks" }
  }
}

/**
 * Reorders tasks for a specific day by updating their positions.
 */
export async function setDayTasksAction(
  dateDoc: string,
  tasks: Task[]
): Promise<ActionState<void>> {
  try {
    const userId = await getAuthenticatedUserId()
    
    const docRef = db
      .collection("userDays")
      .doc(userId)
      .collection("dailyTasks")
      .doc(dateDoc)

    await docRef.set({ tasks }, { merge: true })

    return {
      isSuccess: true,
      message: "Tasks reordered successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error reordering tasks:", error)
    return { isSuccess: false, message: "Failed to reorder tasks" }
  }
}


export async function setBacklogTasksAction(
  tasks: Task[]
): Promise<ActionState<void>> {
  try {
    const userId = await getAuthenticatedUserId()
    const docRef = db.collection("userBacklog").doc(userId)
    await docRef.set({ tasks }, { merge: true })

    return {
      isSuccess: true,
      message: "Backlog tasks set successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error setting backlog tasks:", error)
    return { isSuccess: false, message: "Failed to set backlog tasks" }
  }
}

export async function createTask(args: CreateTaskArgs): Promise<ActionState<void>> {
  try {
    console.log("Creating task:", args)
    console.log("typeof args:", typeof args)    
    const title = args.title
    const description = args.description
    const date = args.date
    const start_time = args.start_time
    const duration_minutes = args.duration_minutes
    const subtasks = args.subtasks
    const urgency = args.urgency
    const importance = args.importance
    console.log("Title:", title);
    console.log("Description:", description);
    console.log("Date:", date);
    console.log("Start Time:", start_time);
    console.log("Duration Minutes:", duration_minutes);
    console.log("Subtasks:", subtasks);
    console.log("Urgency:", urgency);
    console.log("Importance:", importance);
    // Combine date and start_time to create a valid Date object
    const startTime = new Date(`${date}T${start_time}:00`)
    if (isNaN(startTime.getTime())) {
      throw new Error("Invalid start time")
    }
    console.log("Start time:", startTime)
    const endTime = duration_minutes ? new Date(startTime.getTime() + duration_minutes * 60000) : undefined
    console.log("End time:", endTime)
    const calendarItem: CalendarItem = {
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: { dateTime: endTime?.toISOString() }
    }
    console.log("Calendar item:", calendarItem)
    const task = {
      id: crypto.randomUUID(),
      title,
      description,
      subtasks: subtasks?.map(subtask => ({
        text: subtask,
        completed: false,
        id: crypto.randomUUID()
      })) || [],
      durationMinutes: duration_minutes,
      calendarItem,
      urgency: urgency as Urgency,
      importance: importance as Importance,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    console.log("Task:", task)
    const result = await addTaskAction(date, task)
    console.log("Result:", result)
    return {
      isSuccess: true,
      message: "Task created successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error creating task:", error)
    return {
      isSuccess: false,
      message: "Failed to create task"
    }
  }
}

