"use client"

import { Button } from "@/components/ui/button"
import { SearchForm } from "./SearchForm"
import { SidebarFooter } from "./SidebarFooter"
import { useSidebar } from "@/lib/context/sidebar-context"
import { ChatForm } from "../ai-chat/chat"
import { SidebarCalendar } from "./calendar"
import Link from "next/link"
import { ChevronLeft, KanbanSquare, LayoutDashboard, Zap } from "lucide-react"
import { AgentStatusButton } from "@/components/agent/agent-status-button"

export function Sidebar() {
  const { isExpanded, toggleSidebar } = useSidebar()

  return (
    <div
      className={`bg-background flex h-[calc(100vh-64px)] flex-col border-r border-zinc-300/50 transition-all duration-300 ease-in-out dark:border-zinc-800/50 ${
        isExpanded ? "w-96" : "w-16"
      }`}
    >
      <div className="flex items-center justify-between p-2">
        {isExpanded ? (
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold hover:opacity-80">
              ZipDay
            </Link>
            <AgentStatusButton />
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={toggleSidebar}
            className="size-12 p-3"
          >
            <Zap className="!h-8 !w-8" />
          </Button>
        )}
        {isExpanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="size-8"
          >
            <ChevronLeft className="size-4" />
          </Button>
        )}
      </div>

      {isExpanded && (
        <nav className="min-h-[100px] flex-1 space-y-2 overflow-auto p-2">
          <Link href="/dashboard/todo">
            <Button
              variant="ghost"
              className="hover:bg-accent w-full justify-start"
            >
              <LayoutDashboard className="mr-2 size-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/plan">
            <Button
              variant="ghost"
              className="hover:bg-accent w-full justify-start"
            >
              <KanbanSquare className="mr-2 size-4" />
              Plan
            </Button>
          </Link>
        </nav>
      )}

      {isExpanded && (
        <div className="border-t border-zinc-300/50 dark:border-zinc-800/50" />
      )}

      <div className="w-full px-2">
        <SidebarCalendar />
      </div>

      <div className="flex min-h-[300px] flex-col">
        <ChatForm />
      </div>

      <SidebarFooter isExpanded={isExpanded} />
    </div>
  )
}
