"use server"

import { ActionState } from "@/types/server-action-types"
import { UpdatePlanArgs } from "@/types/function-call-types"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { cookies } from "next/headers"

const db = getFirestore()

export async function updatePlan(args: UpdatePlanArgs): Promise<ActionState<void>> {
  try {
    const { todo_list } = args

    // Get current user
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

    // Update plan document
    const planRef = db.collection("users").doc(session.uid).collection("plans").doc("current")
    await planRef.set({
      todo_list,
      updatedAt: new Date()
    }, { merge: true })

    return {
      isSuccess: true,
      message: "Plan updated successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error updating plan:", error)
    return {
      isSuccess: false,
      message: "Failed to update plan"
    }
  }
} 