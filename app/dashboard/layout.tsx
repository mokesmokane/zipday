"use server"

import { Sidebar } from "@/components/sidebar/Sidebar"
import { SiteHeader } from "@/components/site/SiteHeader"
import { getServerUser } from "@/lib/firebaseAdmin"
import { redirect } from "next/navigation"
import { getUserProfileAction } from "@/actions/db/user-actions"

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect("/login")
  }

  const { isSuccess, data: userProfile } = await getUserProfileAction(user.uid)

  if (!isSuccess || !userProfile?.preferences) {
    redirect("/onboarding")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex">
        <Sidebar />
        <main className="h-[calc(100vh-8rem)] flex-1 overflow-y-auto">
          <div className="pb-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
