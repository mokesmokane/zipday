"use server"

import { ActionState } from "@/types/server-action-types"
import { SetCallbackArgs } from "@/types/function-call-types"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { cookies } from "next/headers"

const db = getFirestore()

export async function setCallback(args: SetCallbackArgs): Promise<ActionState<void>> {
  try {
    const { callback_datetime, context } = args

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

    // Create callback document
    const callbackRef = db.collection("users").doc(session.uid).collection("callbacks").doc()
    await callbackRef.set({
      datetime: new Date(callback_datetime),
      context,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    return {
      isSuccess: true,
      message: "Callback scheduled successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error scheduling callback:", error)
    return {
      isSuccess: false,
      message: "Failed to schedule callback"
    }
  }
} 