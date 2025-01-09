"use client"

import { useState, useEffect, useRef } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { format } from "date-fns"
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { TaskColumn } from "./task-column"
import { TaskCard } from "./task-card"

import { useDate } from "@/lib/context/date-context"
import { useTasks } from "@/lib/context/tasks-context"
import {
  updateTaskAction,
  addTaskAction,
  deleteTaskAction
} from "@/actions/db/tasks-actions"
import type { Day, Task } from "@/types/daily-task-types"
import { EditTaskDialog } from "./edit-task-dialog"

const SCROLL_PADDING = 40

export default function DailyPlanner() {
  const {
    selectedDate,
    loadDates,
    addToStartOfDateWindow,
    addToEndOfDateWindow,
    isLoading: isLoadingDates,
    days
  } = useDate()

  const {
    dailyTasks, // Record<string, Day>
    isLoading: isLoadingTasks
  } = useTasks()

  // --------------------------------
  // 1) LOCAL STATE for DRAG & DROP
  // --------------------------------
  const [localDailyTasks, setLocalDailyTasks] = useState<Record<string, Day>>({})
  // The task currently being dragged
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  // The date from which the task was originally dragged
  const [dragStartDate, setDragStartDate] = useState<string | null>(null)
  // The DnDKit "active ID"
  const [activeId, setActiveId] = useState<string | null>(null)
  // A snapshot of localDailyTasks taken at drag start, for revert
  const prevLocalDailyTasksRef = useRef<Record<string, Day> | null>(null)

  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false)
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false)

  // Whenever `dailyTasks` changes, sync local state
  useEffect(() => {
    setLocalDailyTasks(dailyTasks)
  }, [dailyTasks])

  // Build columns from localDailyTasks
  const columns = days.map(dateStr => {
    const doc = localDailyTasks[dateStr] ?? { tasks: [] }
    return {
      date: dateStr,
      tasks: doc.tasks || [],
      id: doc.id,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }
  })

  // Setup DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // --------------------------------
  // UTILS
  // --------------------------------
  function findTaskById(id: string): { date: string; task: Task } | null {
    for (const [date, dailyDoc] of Object.entries(localDailyTasks)) {
      const found = dailyDoc.tasks.find(t => t.id === id)
      if (found) {
        return { date, task: found }
      }
    }
    return null
  }

  // --------------------------------
  // 2) DRAG & DROP EVENT HANDLERS
  // --------------------------------
  function handleDragStart(event: DragStartEvent) {
    console.log("🟦 Drag Start:", {
      activeId: event.active.id,
      event
    })
    setIsDragging(true)
    setActiveId(event.active.id as string)

    // Store a snapshot of localDailyTasks in case we need to revert
    prevLocalDailyTasksRef.current = structuredClone(localDailyTasks)

    // Find the dragged task + date
    const found = findTaskById(event.active.id as string)
    if (!found) return
    const { date: fromDate, task } = found

    setActiveTask(task)
    setDragStartDate(fromDate)
  }

  async function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || !activeTask || !dragStartDate) return

    const activeId = active.id as string
    const overId = over.id as string
    
    // Check for delete zone first
    if (over.id === `${dragStartDate}-delete-zone`) {
      setIsOverDeleteZone(true)
      return // Return early to prevent other updates
    }
    
    // Reset delete zone state if we're not over it
    setIsOverDeleteZone(false)

    // Rest of the existing drag over logic...
    const newCol = columns.find(
      col => col.date === overId || col.tasks.some(t => t.id === overId)
    )
    if (!newCol) return

    const overIndex = newCol.tasks.findIndex(t => t.id === overId)
    const currentIndex = newCol.tasks.findIndex(t => t.id === activeId)
    const indexToInsert = overIndex >= 0 ? overIndex : newCol.tasks.length

    if (currentIndex === indexToInsert && newCol.date === dragStartDate) {
      return
    }

    setLocalDailyTasks(prev => {
      const updated = structuredClone(prev)
      Object.keys(updated).forEach(date => {
        updated[date].tasks = updated[date].tasks.filter(t => t.id !== activeId)
      })

      if (!updated[newCol.date]) {
        updated[newCol.date] = {
          tasks: [],
          date: newCol.date,
          id: "",
          createdAt: "",
          updatedAt: ""
        }
      }

      updated[newCol.date].tasks.splice(indexToInsert, 0, activeTask)
      return updated
    })
  }


  async function deleteTask(taskId: string, date: string) {
    setLocalDailyTasks(prev => {
      const updated = structuredClone(prev)
      updated[date].tasks = updated[date].tasks.filter(t => t.id !== taskId)
      return updated
    })

    await deleteTaskAction(date, taskId)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    console.log("Drag End:", {
      activeId: active?.id,
      overId: over?.id,
      deleteZoneId: dragStartDate ? `${dragStartDate}-delete-zone` : null,
      isOverDeleteZone: over?.id === `${dragStartDate}-delete-zone`
    })

    setIsDragging(false)
    setIsOverDeleteZone(false)
    setActiveId(null)

    // 1) If dropped on the delete zone, do final delete
    if (over?.id === `${dragStartDate}-delete-zone` && dragStartDate && active) {
      const taskToDelete = findTaskById(active.id as string)
      if (taskToDelete) {
        try {
          // Update local state first
          setLocalDailyTasks(prev => {
            const updated = structuredClone(prev)
            updated[taskToDelete.date].tasks = updated[taskToDelete.date].tasks.filter(
              t => t.id !== taskToDelete.task.id
            )
            return updated
          })

          // Then delete from server
          const result = await deleteTaskAction(taskToDelete.date, taskToDelete.task.id)
          if (!result.isSuccess) {
            console.error("Failed to delete task:", result.message)
            // Revert if server delete failed
            if (prevLocalDailyTasksRef.current) {
              setLocalDailyTasks(prevLocalDailyTasksRef.current)
            }
          }
        } catch (error) {
          console.error("Error deleting task:", error)
          // Revert on error
          if (prevLocalDailyTasksRef.current) {
            setLocalDailyTasks(prevLocalDailyTasksRef.current)
          }
        }
      }
      setActiveTask(null)
      setDragStartDate(null)
      return
    }

    // 2) If no valid 'over' or nothing is being dragged, just reset
    if (!over || !activeTask || !dragStartDate) {
      setActiveTask(null)
      setDragStartDate(null)
      return
    }

    // 3) Determine the final target date from the columns
    const targetDate = columns.find(
      col => col.date === over.id || col.tasks.some(t => t.id === over.id)
    )?.date

    if (!targetDate) {
      console.error("Could not find target date; revert local state.")
      if (prevLocalDailyTasksRef.current) {
        setLocalDailyTasks(prevLocalDailyTasksRef.current)
      }
      setActiveTask(null)
      setDragStartDate(null)
      return
    }

    // 4) If we moved or reordered
    try {
      // a) Reordering / moving within the same date
      if (dragStartDate === targetDate) {
        // The local state is already up-to-date from handleDragOver
        // => Just save to Firestore
        await saveDayChangesToFirestore(targetDate, localDailyTasks[targetDate])
      } else {
        // b) Moved to a different date
        // The local state is updated from handleDragOver to reflect new day
        // => We just do the Firestore calls
        // Save new day
        await saveDayChangesToFirestore(targetDate, localDailyTasks[targetDate])
        // Save old day
        if (localDailyTasks[dragStartDate]) {
          await saveDayChangesToFirestore(dragStartDate, localDailyTasks[dragStartDate])
        }
      }
    } catch (error) {
      console.error("Failed to save reordering/move to Firestore:", error)
      // revert local if needed
      if (prevLocalDailyTasksRef.current) {
        setLocalDailyTasks(prevLocalDailyTasksRef.current)
      }
    }

    // 5) Cleanup
    setActiveTask(null)
    setDragStartDate(null)
  }

  // --------------------------------
  // 3) ADD TASK
  // --------------------------------
  async function addTask(dateStr: string) {
    setNewTaskDate(dateStr)
    setIsNewTaskDialogOpen(true)
  }

  // --------------------------------
  // DRAG OVERLAY
  // --------------------------------
  const dragOverlayContent = activeTask ? <TaskCard task={activeTask} isOverDeleteZone={isOverDeleteZone} /> : null

  // --------------------------------
  // SCROLL TO A DATE
  // --------------------------------
  const containerRef = useRef<HTMLDivElement>(null)

  function scrollToDate(dateStr: string) {
    const targetColumn = columns.find(col => col.date === dateStr)
    if (!targetColumn || !containerRef.current) {
      loadDates(new Date(dateStr))
      return
    }
    const columnElement = document.getElementById(dateStr)
    if (!columnElement) return

    const container = containerRef.current
    const scrollLeft =
      columnElement.offsetLeft -
      container.offsetWidth / 2 +
      columnElement.offsetWidth / 2

    container.scrollTo({ left: scrollLeft, behavior: "smooth" })
  }

  // Whenever selectedDate changes, scroll to that date’s column
  useEffect(() => {
    if (selectedDate) {
      scrollToDate(format(selectedDate, "yyyy-MM-dd"))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, columns])

  // --------------------------------
  // LOADING STATE
  // --------------------------------
  const isLoading = isLoadingDates || isLoadingTasks


  // --------------------------------
  async function saveDayChangesToFirestore(dateStr: string, dayData: Day) {
    try {
      console.log("Saving day to Firestore:", { dateStr, dayData })

      const prevDay = prevLocalDailyTasksRef.current?.[dateStr]
      // Filter out any undefined tasks before mapping
      const prevTasks = new Set(
        (prevDay?.tasks || []).filter(Boolean).map(t => t.id)
      )
      const currentTasks = new Set(
        (dayData?.tasks || []).filter(Boolean).map(t => t.id)
      )

      // Ensure tasks array exists and filter out undefined tasks
      const validTasks = (dayData?.tasks || []).filter(Boolean)

      // For task updates, only update tasks that already exist
      const tasksToUpdate = validTasks.filter(t => prevTasks.has(t.id))

      // Only add tasks that don't exist yet
      const tasksToAdd = validTasks.filter(t => !prevTasks.has(t.id))

      // Find tasks that were removed
      const tasksToDelete = (prevDay?.tasks || [])
        .filter(Boolean)
        .filter(t => !currentTasks.has(t.id))

      console.log("Tasks to process:", {
        update: tasksToUpdate.length,
        add: tasksToAdd.length,
        delete: tasksToDelete.length
      })

      // Handle updates first
      for (const task of tasksToUpdate) {
        console.log("Updating task:", task.id)
        const { id, createdAt, updatedAt, ...updates } = task
        await updateTaskAction(dateStr, id, { ...updates })
      }

      // Handle new tasks
      for (const task of tasksToAdd) {
        console.log("Creating task:", task)
        await addTaskAction(dateStr, { ...task })
      }

      // Handle deletions
      for (const task of tasksToDelete) {
        console.log("Deleting task:", task.id)
        await deleteTaskAction(dateStr, task.id)
      }

      console.log("Successfully saved day to Firestore:", dateStr)
    } catch (error) {
      console.error("Error saving day to Firestore:", error)
      throw error // Re-throw to handle in the caller
    }
  }

  // Log state changes
  useEffect(() => {
    console.log("🔄 State Update:", {
      isDragging,
      isOverDeleteZone,
      activeId,
      dragStartDate
    })
  }, [isDragging, isOverDeleteZone, activeId, dragStartDate])

  // --------------------------------
  // RENDER
  // --------------------------------
  return (
    <div className="relative size-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
       
        <div className="relative h-full">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 absolute left-0 top-1/2 z-10 -translate-y-1/2 backdrop-blur-sm"
            onClick={() => addToStartOfDateWindow()}
            disabled={isLoading}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 absolute right-0 top-1/2 z-10 -translate-y-1/2 backdrop-blur-sm"
            onClick={() => addToEndOfDateWindow()}
            disabled={isLoading}
          >
            <ChevronRight className="size-4" />
          </Button>

          <div
            ref={containerRef}
            className="flex h-full snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-12 scrollbar-hide"
            style={{
              scrollPaddingLeft: SCROLL_PADDING,
              scrollPaddingRight: SCROLL_PADDING
            }}
          >
            {columns.map(column => (
              <div
                key={column.date}
                id={column.date}
                className="w-[300px] shrink-0 snap-center"
              >
                <div className="mb-4 space-y-1.5">
                  <h2 className="text-lg font-semibold">
                    {format(new Date(column.date), "EEEE")}
                    <span className="text-muted-foreground text-sm ml-2">
                      {format(new Date(column.date), "MMM d")}
                    </span>
                  </h2>
                </div>

                <SortableContext
                  items={column.tasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <TaskColumn
                    id={column.date}
                    isDragging={isDragging}
                    isOverDeleteZone={isOverDeleteZone}
                    showDeleteZone={dragStartDate === column.date && (!activeId || findTaskById(activeId)?.date === column.date)}
                  >
                    {column.tasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        day={column}
                        isOverDeleteZone={isOverDeleteZone && activeTask?.id === task.id}
                        onDelete={async (taskId) => {
                          await deleteTask(taskId, column.date)
                        }}
                        onTaskUpdate={async updatedTask => {
                          try {
                            console.log("Task update triggered:", updatedTask)
                            // Update local state
                            setLocalDailyTasks(prev => {
                              const updated = structuredClone(prev)
                              if (!updated[column.date]) {
                                updated[column.date] = {
                                  tasks: [],
                                  date: column.date,
                                  id: "",
                                  createdAt: "",
                                  updatedAt: ""
                                }
                              }
                              updated[column.date].tasks =
                                updated[column.date].tasks.map(t =>
                                  t.id === updatedTask.id ? updatedTask : t
                                )
                              return updated
                            })

                            await updateTaskAction(column.date, updatedTask.id, { ...updatedTask })
                          } catch (error) {
                            console.error("Failed to update task:", error)
                          }
                        }}
                      />
                    ))}
                  </TaskColumn>
                </SortableContext>

                <Button
                  variant="outline"
                  className="mt-4 w-full justify-start"
                  onClick={() => addTask(column.date)}
                >
                  <Plus className="mr-2 size-4" />
                  Add task
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DragOverlay>{dragOverlayContent}</DragOverlay>

        {newTaskDate && (
          <EditTaskDialog
            day={{
              date: newTaskDate,
              tasks: localDailyTasks[newTaskDate]?.tasks || [],
              id: localDailyTasks[newTaskDate]?.id || "",
              createdAt: localDailyTasks[newTaskDate]?.createdAt || "",
              updatedAt: localDailyTasks[newTaskDate]?.updatedAt || ""
            }}
            isNewTask={true}
            task={{
              id: crypto.randomUUID(),
              title: "New Task",
              time: "",
              subtasks: [],
              completed: false,
              tags: ["work"],
              order: localDailyTasks[newTaskDate]?.tasks?.length || 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }}
            open={isNewTaskDialogOpen}
            onOpenChange={setIsNewTaskDialogOpen}
            onSave={async newTask => {
              try {
                // Create the new day data
                const updatedDay = {
                  tasks: [
                    ...(localDailyTasks[newTaskDate]?.tasks || []),
                    newTask
                  ],
                  date: newTaskDate,
                  id: localDailyTasks[newTaskDate]?.id || "",
                  createdAt: localDailyTasks[newTaskDate]?.createdAt || "",
                  updatedAt: localDailyTasks[newTaskDate]?.updatedAt || ""
                }

                // Update local state
                setLocalDailyTasks(prev => ({
                  ...prev,
                  [newTaskDate]: updatedDay
                }))

                // Save to Firestore
                await addTaskAction(newTaskDate, newTask)
              } catch (error) {
                console.error("Failed to add new task:", error)
              }
            }}
          />
        )}
      </DndContext>
    </div>
  )
}
