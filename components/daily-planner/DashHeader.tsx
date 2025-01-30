"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/lib/context/auth-context"
import {
  ChevronRight,
  User,
  LogOut,
  LayoutGrid,
  Calendar,
  Filter,
  X,
  Trash2,
  Tag,
  Clock
} from "lucide-react"
import { useState } from "react"
import { ThemeSwitcher } from "@/components/utilities/theme-switcher"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { Settings, CreditCard } from "lucide-react"
import { useSidebar } from "@/lib/context/sidebar-context"
import { SubscriptionBadge } from "@/components/site/SubscriptionBadge"
import { getAuth, signOut } from "firebase/auth"
import { useFilter } from "@/lib/context/filter-context"
import { Badge } from "@/components/ui/badge"
import { useCurrentView } from "@/lib/context/current-view-context"
import { GoogleCalendarButton } from "./google-calendar-button"
import { useSelectedTasks } from "@/lib/context/selected-tasks-context"
import { useTasks } from "@/lib/context/tasks-context"
import { useBacklog } from "@/lib/context/backlog-context"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type ViewType = "board" | "calendar"

export function DashHeader() {
  const { user, isAuthenticated } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { isExpanded, toggleSidebar } = useSidebar()
  const { currentView, setCurrentView } = useCurrentView()
  const {
    activeFilters,
    recentTags,
    availableTags,
    addFilter,
    removeFilter,
    clearFilters
  } = useFilter()
  const { selectedTasks, clearSelectedTasks } = useSelectedTasks()
  const { deleteTask, updateTask } = useTasks()
  const { deleteBacklogTask } = useBacklog()

  const handleSignOut = async () => {
    try {
      const auth = getAuth()
      await signOut(auth)
      await fetch("/api/auth/session", { method: "DELETE" })
      window.location.href = "/"
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleConnectCalendar = async () => {
    try {
      // TODO: Implement Google Calendar OAuth flow
      window.location.href = "/api/google/calendar/connect"
    } catch (error) {
      console.error("Failed to connect Google Calendar:", error)
    }
  }

  const handleDisconnectCalendar = async () => {
    try {
      // TODO: Implement Google Calendar disconnect
      await fetch("/api/google/calendar/disconnect", { method: "POST" })
    } catch (error) {
      console.error("Failed to disconnect Google Calendar:", error)
    }
  }

  const handleBulkDelete = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmBulkDelete = async () => {
    try {
      // Delete each selected task
      await Promise.all(
        selectedTasks.map(task =>
          task.isBacklog ? deleteBacklogTask(task.id) : deleteTask(task.id)
        )
      )
      clearSelectedTasks()
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Failed to delete selected tasks:", error)
    }
  }

  const handleBulkAddTag = async (tag: string) => {
    try {
      // Add tag to each selected task
      await Promise.all(
        selectedTasks.map(task => {
          const updatedTask = {
            ...task,
            tags: [...new Set([...(task.tags || []), tag])]
          }
          return task.isBacklog
            ? deleteBacklogTask(task.id)
            : updateTask(task.id, updatedTask)
        })
      )
      clearSelectedTasks()
    } catch (error) {
      console.error("Failed to add tag to selected tasks:", error)
    }
  }

  const handleBulkSetDuration = async (durationMinutes: number) => {
    try {
      // Set duration for each selected task
      await Promise.all(
        selectedTasks.map(task => {
          const updatedTask = {
            ...task,
            durationMinutes
          }
          return task.isBacklog
            ? deleteBacklogTask(task.id)
            : updateTask(task.id, updatedTask)
        })
      )
      clearSelectedTasks()
    } catch (error) {
      console.error("Failed to set duration for selected tasks:", error)
    }
  }

  return (
    <header className="bg-background sticky top-0 z-40 w-full">
      <div className="flex h-12 items-center gap-4 px-4">
        {!isExpanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2"
          >
            <ChevronRight className="size-4" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        )}

        {selectedTasks.length > 0 ? (
          // Show bulk actions when tasks are selected
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="mr-2">
              {selectedTasks.length} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearSelectedTasks()}
              className="text-muted-foreground"
            >
              Clear selection
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              className="text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Tag className="mr-2 size-4" />
                  Add Tag
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {availableTags.map(tag => (
                  <DropdownMenuItem
                    key={tag}
                    onClick={() => handleBulkAddTag(tag)}
                  >
                    {tag}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Clock className="mr-2 size-4" />
                  Set Duration
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {[15, 30, 45, 60, 90, 120].map(minutes => (
                  <DropdownMenuItem
                    key={minutes}
                    onClick={() => handleBulkSetDuration(minutes)}
                  >
                    {minutes} minutes
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          // Show normal header content when no tasks are selected
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2">
                  <Filter className="mr-2 size-4" />
                  Filter
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {recentTags.length > 0 && (
                  <>
                    <DropdownMenuLabel>Recent Tags</DropdownMenuLabel>
                    {recentTags.map(tag => (
                      <DropdownMenuItem
                        key={tag}
                        onClick={() => {
                          if (activeFilters.includes(tag)) {
                            removeFilter(tag)
                          } else {
                            addFilter(tag)
                          }
                        }}
                        className={`flex items-center justify-between ${
                          activeFilters.includes(tag)
                            ? "bg-primary/10 dark:bg-primary/20"
                            : ""
                        }`}
                      >
                        {tag}
                        {activeFilters.includes(tag) && (
                          <X
                            className="hover:text-destructive size-4 cursor-pointer"
                            onClick={e => {
                              e.stopPropagation()
                              removeFilter(tag)
                            }}
                          />
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {availableTags.length > 0 && (
                  <>
                    <DropdownMenuLabel>All Tags</DropdownMenuLabel>
                    {availableTags
                      .filter(tag => !recentTags.includes(tag))
                      .map(tag => (
                        <DropdownMenuItem
                          key={tag}
                          onClick={() => {
                            if (activeFilters.includes(tag)) {
                              removeFilter(tag)
                            } else {
                              addFilter(tag)
                            }
                          }}
                          className={`flex items-center justify-between ${
                            activeFilters.includes(tag)
                              ? "bg-primary/10 dark:bg-primary/20"
                              : ""
                          }`}
                        >
                          {tag}
                          {activeFilters.includes(tag) && (
                            <X
                              className="hover:text-destructive size-4 cursor-pointer"
                              onClick={e => {
                                e.stopPropagation()
                                removeFilter(tag)
                              }}
                            />
                          )}
                        </DropdownMenuItem>
                      ))}
                  </>
                )}

                {activeFilters.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={clearFilters}>
                      Clear filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <GoogleCalendarButton
            onConnect={handleConnectCalendar}
            onDisconnect={handleDisconnectCalendar}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {currentView === "board" ? (
                  <LayoutGrid className="mr-2 size-4" />
                ) : (
                  <Calendar className="mr-2 size-4" />
                )}
                {currentView === "board" ? "Board" : "Calendar"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCurrentView("board")}>
                <LayoutGrid className="mr-2 size-4" />
                Board
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentView("calendar")}>
                <Calendar className="mr-2 size-4" />
                Calendar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Selected Tasks"
        description={`Are you sure you want to delete ${selectedTasks.length} selected task${selectedTasks.length === 1 ? "" : "s"}?`}
        onConfirm={handleConfirmBulkDelete}
      />
    </header>
  )
}
