"use client"

import { Button } from "@/components/ui/button"
import { SearchForm } from "./SearchForm"
import { SidebarFooter } from "./SidebarFooter"
import { useSidebar } from "@/lib/context/sidebar-context"
import { ChatForm } from "../ai-chat/chat"
import { SidebarCalendar } from "./calendar"
import Link from "next/link"
import { ChevronLeft, Zap } from "lucide-react"

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
        <div className="p-2">
          <SearchForm />
        </div>
      )}
      {isExpanded && (
      <nav className="flex-1 space-y-2 overflow-auto p-2">
        <Button
          variant="ghost"
          className="hover:bg-accent w-full justify-start"
        >
          Dashboard
        </Button>
        <Button
          variant="ghost"
          className="hover:bg-accent w-full justify-start"
        >
          Projects
        </Button>
        </nav>
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
