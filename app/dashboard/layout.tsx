"use server"

import { Sidebar } from "@/components/sidebar/Sidebar"
import { SiteHeader } from "@/components/site/SiteHeader"
import { getServerUser } from "@/lib/firebaseAdmin"
import { redirect } from "next/navigation"
import { getUserProfileAction } from "@/actions/db/user-actions"
import { AgentEventsSidebar } from "@/components/agent/agent-events-sidebar"
import { DndContextProvider } from "@/components/providers/dnd-context-provider"

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
      <div className="flex flex-1">
        <DndContextProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div>{children}</div>
          </main>
          <AgentEventsSidebar />
        </DndContextProvider>
      </div>
    </div>
  )
}
