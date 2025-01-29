"use server"

import { firestore } from "firebase-admin"
import { ActionState } from "@/types/server-action-types"
import type { UserPreferences, UserProfile } from "@/types/user-types"
import { AddUserNotesArgs } from "@/types/function-call-types"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { cookies } from "next/headers"

const db = getFirestore()

export async function getUserProfileAction(
  userId: string
): Promise<ActionState<UserProfile | null>> {
  try {
    const userDoc = await firestore()
      .collection("users")
      .doc(userId)
      .get()
    
    const userData = userDoc.data() as UserProfile | undefined
    
    return {
      isSuccess: true,
      message: "User profile retrieved successfully",
      data: userData || null
    }
  } catch (error) {
    console.error("Error getting user profile:", error)
    return { isSuccess: false, message: "Failed to get user profile" }
  }
}

export async function updateUserPreferencesAction(
  userId: string,
  preferences: UserPreferences
): Promise<ActionState<UserProfile | null>> {
  try {   
    await firestore()
      .collection("users")
      .doc(userId)
      .update({ preferences })

    return { isSuccess: true, message: "User preferences updated successfully", data: null }
  } catch (error) {
    console.error("Error updating user preferences:", error)
    return { isSuccess: false, message: "Failed to update user preferences" }
  }
}

export async function addUserNotes(args: AddUserNotesArgs): Promise<ActionState<void>> {
  try {
    const { explicit_instructions, interaction_notes } = args

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

    // Update user document with notes
    const userRef = db.collection("users").doc(session.uid)
    await userRef.update({
      "ai_notes.explicit_instructions": explicit_instructions,
      "ai_notes.interaction_notes": interaction_notes,
      updatedAt: new Date()
    })

    return {
      isSuccess: true,
      message: "User notes updated successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error updating user notes:", error)
    return {
      isSuccess: false,
      message: "Failed to update user notes"
    }
  }
}