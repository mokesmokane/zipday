"use client"

import { Button } from "@/components/ui/button"
import { SearchForm } from "./SearchForm"
import { SidebarFooter } from "./SidebarFooter"
import { useSidebar } from "@/lib/context/sidebar-context"
import { ChatForm } from "../ai-chat/chat"
import { SidebarCalendar } from "./calendar"
import Link from "next/link"
import { ChevronLeft, KanbanSquare, LayoutDashboard, Zap } from "lucide-react"

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
          <Link href="/" className="text-xl font-bold hover:opacity-80">
            ZipDay
          </Link>
        ) : (
          <Button
            variant="ghost"
            onClick={toggleSidebar}
            className="h-12 w-12 p-3"
          >
            <Zap className="!h-8 !w-8" />
          </Button>
        )}
        {isExpanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {isExpanded && (
      <nav className="flex-1 space-y-2 overflow-auto p-2 min-h-[100px]">
        <Link href="/dashboard/todo">
          <Button
            variant="ghost"
            className="hover:bg-accent w-full justify-start"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link href="/board">
          <Button
            variant="ghost"
            className="hover:bg-accent w-full justify-start"
          >
            <KanbanSquare className="mr-2 h-4 w-4" />
            Plan
          </Button>
        </Link>
      </nav>
      )}

      {isExpanded && (
        <div className="border-t border-zinc-300/50 dark:border-zinc-800/50" />
      )}

      <div className="w-full px-2">
        <SidebarCalendar/>
      </div>

      <div className="flex min-h-[300px] flex-col">
        <ChatForm />
      </div>

      <SidebarFooter isExpanded={isExpanded} />
    </div>
  )
}
