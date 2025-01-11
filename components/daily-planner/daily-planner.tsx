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
import { motion, AnimatePresence } from "framer-motion"

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
import type { Day, Task, DailyTasks } from "@/types/daily-task-types"
import { EditTaskDialog } from "./edit-task-dialog"
import { useFilter } from "@/lib/context/filter-context"
import { useCurrentView } from "@/lib/context/current-view-context"
import { CalendarColumn } from "./calendar-column"
import { useDebounce } from "@/lib/hooks/use-debounce"

const SCROLL_PADDING = 40

const dropAnimationConfig = {
  duration: 200,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)"
}

// Add this utility function outside the component
const dateCache = new Map<string, string>()

function getTargetDate(id: string, columns: Array<{ date: string; tasks: Task[] }>) {
  // First check if this is a direct date match
  if (columns.some(col => col.date === id)) {
    return id
  }

  // Check cache for calendar IDs
  if (dateCache.has(id)) {
    return dateCache.get(id)
  }

  // Check if it's a calendar ID
  if (id.startsWith('calendar-')) {
    const [_, year, month, day] = id.split('-')
    const date = `${year}-${month}-${day}`
    dateCache.set(id, date)
    return date
  }

  // Check if it's a task ID
  const column = columns.find(col => col.tasks.some(t => t.id === id))
  return column?.date
}

export default function DailyPlanner() {
  const {
    loadDates,
    addToStartOfDateWindow,
    addToEndOfDateWindow,
    isLoading: isLoadingDates,
    days
  } = useDate()

  const {
    dailyTasks,
    isLoading: isLoadingTasks
  } = useTasks()

  const { setAvailableTags } = useFilter()
  const { activeFilters } = useFilter()

  // Update available tags whenever dailyTasks changes
  useEffect(() => {
    const allTags = new Set<string>()
    Object.values(dailyTasks as DailyTasks).forEach(dailyDoc => {
      dailyDoc.tasks.forEach(task => {
        task.tags?.forEach(tag => allTags.add(tag))
      })
    })
    setAvailableTags(Array.from(allTags))
  }, [dailyTasks, setAvailableTags])

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
  const [isOverCalendarZone, setIsOverCalendarZone] = useState<string | null>(null)
  const [previewColumnDate, setPreviewColumnDate] = useState<string | null>(null)
  const [showCalendarAfterDrop, setShowCalendarAfterDrop] = useState(false)
  const { selectedDate, setSelectedDate } = useDate()
  const { currentView, setCurrentView } = useCurrentView()
  const [showCalendar, setShowCalendar] = useState<string | null>(null)
  const debouncedCalendarZone = useDebounce(isOverCalendarZone, 2000)

  // Add effect to handle debounced calendar zone
  useEffect(() => {
    if (debouncedCalendarZone) {
      setShowCalendar(debouncedCalendarZone)
    } else {
      setShowCalendar(null)
    }
  }, [debouncedCalendarZone])

  // Whenever `dailyTasks` changes, sync local state
  useEffect(() => {
    setLocalDailyTasks(dailyTasks)
  }, [dailyTasks])

  // Build columns from localDailyTasks with filtering
  const columns = days.map(dateStr => {
    const doc = localDailyTasks[dateStr] ?? { tasks: [] }
    const filteredTasks = activeFilters.length > 0
      ? doc.tasks.filter(task => 
          task.tags?.some(tag => activeFilters.includes(tag))
        )
      : doc.tasks
    return {
      date: dateStr,
      tasks: filteredTasks || [],
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

  const findColumnIndexByDate = (date: string) => {
    return columns.findIndex(col => col.date === date)
  }

  // --------------------------------
  // 2) DRAG & DROP EVENT HANDLERS
  // --------------------------------
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setIsDragging(true)
    setActiveId(active.id as string)
    const task = findTaskById(active.id as string)
    if (task) {
      setActiveTask(task.task)
      setDragStartDate(task.date)
      setPreviewColumnDate(task.date)
      // Save the current state before any changes
      prevLocalDailyTasksRef.current = structuredClone(localDailyTasks)
    }
  }

  async function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || !activeTask || !dragStartDate) return

    const activeId = active.id as string
    const overId = over.id as string
    
    // Check for delete zone first
    if (over.id === `${dragStartDate}-calendar-zone`) {
      setIsOverCalendarZone(dragStartDate)
      return
    }
    
    setIsOverCalendarZone(null)

    // Check if dropping into a calendar hour slot
    const hourMatch = overId.match(/calendar-(.+)-hour-(\d+)/)
    if (hourMatch) {
      const [_, targetDate, hourStr] = hourMatch
      const hour = parseInt(hourStr, 10)
      
      // Update the task with the new time
      const updatedTask = {
        ...activeTask,
        time: `${hour.toString().padStart(2, "0")}:00`
      }

      // Update local state more efficiently
      setLocalDailyTasks(prev => {
        // Only clone the dates we need to modify
        const updated = { ...prev }
        
        // Remove task from source date if it exists
        if (dragStartDate) {
          if (updated[dragStartDate]) {
            updated[dragStartDate] = {
              ...updated[dragStartDate],
              tasks: updated[dragStartDate].tasks.filter(t => t.id !== activeId)
            }
          }
        }

        // Initialize or update target date
        if (!updated[targetDate]) {
          updated[targetDate] = {
            tasks: [],
            date: targetDate,
            id: "",
            createdAt: "",
            updatedAt: ""
          }
        } else {
          updated[targetDate] = { ...updated[targetDate] }
        }
        
        // Check if task already exists in target date before adding
        const taskExists = updated[targetDate].tasks.some(t => t.id === activeId)
        if (!taskExists) {
          updated[targetDate].tasks = [...updated[targetDate].tasks, updatedTask]
        }

        return updated
      })
      return
    }

    // Handle regular column drops
    const newCol = columns.find(
      col => col.date === overId || col.tasks.some(t => t.id === overId)
    )
    if (!newCol) return

    const overIndex = newCol.tasks.findIndex(t => t.id === overId)
    const currentIndex = newCol.tasks.findIndex(t => t.id === activeId)
    const indexToInsert = overIndex >= 0 ? overIndex : newCol.tasks.length

    // Add this check to prevent unnecessary updates
    if (currentIndex === indexToInsert && newCol.date === dragStartDate) {
      return
    }

    // Batch the state update
    setLocalDailyTasks(prev => {
      // Check if the state would actually change
      const isTaskInSamePosition = 
        prev[newCol.date]?.tasks[indexToInsert]?.id === activeId &&
        newCol.date === dragStartDate

      if (isTaskInSamePosition) {
        return prev
      }

      const updated = structuredClone(prev)
      
      // Remove task from all dates
      Object.keys(updated).forEach(date => {
        updated[date].tasks = updated[date].tasks.filter(t => t.id !== activeId)
      })

      // Initialize target date if needed
      if (!updated[newCol.date]) {
        updated[newCol.date] = {
          tasks: [],
          date: newCol.date,
          id: "",
          createdAt: "",
          updatedAt: ""
        }
      }

      // Check if task already exists before inserting
      const taskExists = updated[newCol.date].tasks.some(t => t.id === activeId)
      if (!taskExists) {
        updated[newCol.date].tasks.splice(indexToInsert, 0, activeTask)
      }
      
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

    setPreviewColumnDate(null) // Clear preview column
    setIsDragging(false)
    setActiveId(null)
    setActiveTask(null)
    setDragStartDate(null)
    setShowCalendar(null)

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
    console.log("Over:", over)
    //calendar id : "calendar-2025-01-11-hour-8"
    function getDateFromCalendarId(id: string) {
      var year =  id.split("-")[1]
      var month = id.split("-")[2]
      var day = id.split("-")[3]
      return `${year}-${month}-${day}`
    }
    //day column id : "2025-01-11"
    const targetDate = over ? getTargetDate(over.id.toString(), columns) : null

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
  const dragOverlayContent = activeTask ? <TaskCard task={activeTask} isOverCalendarZone={isOverCalendarZone !== null} /> : null

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

      // Get the previous state of tasks for this date
      const prevDay = prevLocalDailyTasksRef.current?.[dateStr]
      
      // Create sets of task IDs for comparison
      const prevTaskIds = new Set(prevDay?.tasks?.map(t => t.id) || [])
      const currentTaskIds = new Set(dayData?.tasks?.map(t => t.id) || [])

      // Determine which tasks need to be processed
      const tasksToUpdate = dayData?.tasks?.filter(t => prevTaskIds.has(t.id)) || []
      const tasksToAdd = dayData?.tasks?.filter(t => !prevTaskIds.has(t.id)) || []
      const tasksToDelete = prevDay?.tasks?.filter(t => !currentTaskIds.has(t.id)) || []

      console.log("Tasks to process:", {
        update: tasksToUpdate.length,
        add: tasksToAdd.length,
        delete: tasksToDelete.length
      })

      // Process updates
      for (const task of tasksToUpdate) {
        const { id, createdAt, updatedAt, ...updates } = task
        await updateTaskAction(dateStr, id, updates)
      }

      // Process additions
      for (const task of tasksToAdd) {
        await addTaskAction(dateStr, task)
      }

      // Process deletions
      for (const task of tasksToDelete) {
        await deleteTaskAction(dateStr, task.id)
      }

      console.log("Successfully saved day to Firestore:", dateStr)
    } catch (error) {
      console.error("Error saving day to Firestore:", error)
      throw error
    }
  }

  // Log state changes
  useEffect(() => {
    console.log("🔄 State Update:", {
      isDragging,
      isOverCalendarZone,
      activeId,
      dragStartDate
    })
  }, [isDragging, isOverCalendarZone, activeId, dragStartDate])
  

  // Constants for date navigation
  const COLUMNS_TO_SCROLL = 3

  function handleLeftClick() {
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setDate(newDate.getDate() - COLUMNS_TO_SCROLL)
      setSelectedDate(newDate)

      // Check if we need more data
      const formattedNewDate = format(newDate, "yyyy-MM-dd")
      if (!columns.some(col => col.date === formattedNewDate)) {
        addToStartOfDateWindow()
      }
    }
  }

  function handleRightClick() {
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setDate(newDate.getDate() + COLUMNS_TO_SCROLL)
      setSelectedDate(newDate)

      // Check if we need more data
      const formattedNewDate = format(newDate, "yyyy-MM-dd")
      if (!columns.some(col => col.date === formattedNewDate)) {
        addToEndOfDateWindow()
      }
    }
  }

  // Add a scroll event listener to load more data when needed
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      // Load more data when scrolling near the edges
      if (container.scrollLeft < 100) {
        addToStartOfDateWindow()
      } else if (container.scrollLeft + container.offsetWidth > container.scrollWidth - 100) {
        addToEndOfDateWindow()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [addToEndOfDateWindow, addToStartOfDateWindow])

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
            onClick={handleLeftClick}
            disabled={isLoading}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 absolute right-0 top-1/2 z-10 -translate-y-1/2 backdrop-blur-sm"
            onClick={handleRightClick}
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
            {columns.map((column) => (
              <div key={column.date} className="flex gap-6">
                <div 
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

                  {currentView === 'board' && showCalendar !== column.date ? (
                    <>
                      <SortableContext
                        items={column.tasks.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <TaskColumn
                          id={column.date}
                          isDragging={isDragging}
                          isOverCalendarZone={isOverCalendarZone === column.date}
                          showCalendarZone={dragStartDate === column.date && (!activeId || findTaskById(activeId)?.date === column.date)}
                        >
                          {column.tasks.map(task => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              day={column}
                              isOverCalendarZone={isOverCalendarZone === column.date && activeTask?.id === task.id}
                              onDelete={async (taskId) => {
                                await deleteTask(taskId, column.date)
                              }}
                              onTaskUpdate={async updatedTask => {
                                try {
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
                    </>
                  ) : (
                    <CalendarColumn
                      id={`calendar-${column.date}`}
                      date={column.date}
                      tasks={column.tasks}
                      onAddTask={async (hour) => {
                        if (activeTask) {
                          const updatedTask = {
                            ...activeTask,
                            time: `${hour.toString().padStart(2, "0")}:00`
                          }
                          try {
                            await updateTaskAction(column.date, activeTask.id, updatedTask)
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
                              updated[column.date].tasks = updated[column.date].tasks.map(t =>
                                t.id === activeTask.id ? updatedTask : t
                              )
                              return updated
                            })
                          } catch (error) {
                            console.error("Failed to update task time:", error)
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeId && activeTask && dragStartDate ? (
            <TaskCard
              task={activeTask}
              day={columns[findColumnIndexByDate(dragStartDate)]}
              isOverCalendarZone={isOverCalendarZone === dragStartDate}
            />
          ) : null}
        </DragOverlay>

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
