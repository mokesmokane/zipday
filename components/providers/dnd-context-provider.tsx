"use client"

import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensors, useSensor, DragOverlay } from "@dnd-kit/core"
import { Task } from "@/types/daily-task-types"
import { TaskCard } from "@/components/daily-planner/task-card"
import { cn } from "@/lib/utils"
import { useActiveTask } from "@/lib/context/active-task-context"
import { format } from "date-fns"
import { v4 as uuidv4 } from "uuid"
import { useTasks } from "@/lib/context/tasks-context"
import { useBacklog } from "@/lib/context/backlog-context"
import { useDate } from "@/lib/context/date-context"

interface DndContextProviderProps {
  children: React.ReactNode
}
const ALLOWED_DROPS: Record<ColumnId, ColumnId[]> = {
    backlog: ["today", "calendar", "backlog"],
    incomplete: ["backlog", "today", "calendar"],
    today: ["backlog", "calendar", "today"],
    future: ["backlog", "calendar", "today"],
    calendar: ["backlog", "today", "calendar"]
  }
// Add this type definition at the top of the file
type ColumnId = "backlog" | "incomplete" | "today" | "future" | "calendar"

export function DndContextProvider({ children }: DndContextProviderProps) {
    const { addTasks, addTask, deleteTask, updateTask, reorderDayTasks, refreshTasks } =
    useTasks()  
    const { refreshBacklog, deleteBacklogTask, reorderTasks:reorderBacklogTasks, clearPreviews, addTasks:addBacklogTasks } = useBacklog()
    const { selectedDate } = useDate()
  const {
    activeTask,
    sourceColumnId,
    isDraggingOverCalendar,
    isDraggingOverChat,
    localColumnTasks,
    previewTask,
    previewColumnId,
    isDragging,
    setActiveTask,
    setIsDragging,
    setSourceColumnId,
    setIsDraggingOverCalendar,
    setIsDraggingOverChat,
    setPreviewTask,
    setPreviewColumnId,
    setLocalColumnTasks
  } = useActiveTask()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    console.log("Drag start event:", event)
    const { active } = event
    const activeId = active.id.toString()
    const taskElement = document.querySelector(`[data-task-id="${activeId}"]`)
    if (taskElement) {
      const taskData = JSON.parse(taskElement.getAttribute('data-task') || '{}')
      if (taskData.id) {
        setActiveTask(taskData)
        setIsDragging(true)
      }
    }

    // Check if this is a calendar item by looking for 'calendar' prefix
    const isCalendar = activeId.startsWith("calendar-")

    // Get the column ID
    const columnId = isCalendar
      ? "calendar"
      : (active.data.current?.sortable?.containerId?.split("-")[0] as ColumnId)
    setSourceColumnId(columnId)

    // Extract the task ID - for calendar items, remove the 'calendar-' prefix
    const taskId = isCalendar ? activeId.replace("calendar-", "") : activeId

  }

//   function handleDragStart(event: DragStartEvent) {
//   }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    // Check if dragging over chat
    if (over.id === "ai-chat-droppable") {
      setIsDraggingOverChat(true)
      setLocalColumnTasks((prev: Record<string, Task[]>) => {
        const updated = structuredClone(prev)

        Object.keys(updated).forEach(date => {
            if (date !== over.id && date !== sourceColumnId) {
                updated[date] = updated[date].filter((t: Task) => t.id !== active.id)
            }
        })

        return updated
      })
      return
    } else {
      setIsDraggingOverChat(false)
      // Handle other drag over cases...
      handleDragOverOriginal(event)
    }

  }

  const handleDragOverOriginal = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || !activeTask) return

    console.log("Active task:", activeTask)
    console.log("Over:", over)

    const activeId = active.id as string
    const overId = over.id as string

    // Check if over a calendar hour
    const isOverCalendarHour = overId.match(/calendar-(.+)-hour-(\d+)/)
    const isOverCalendarColumn = overId.startsWith("calendar-")

    if (isOverCalendarHour || isOverCalendarColumn) {
      setIsDraggingOverCalendar(true)
      const targetDate = isOverCalendarHour
        ? overId.split("-")[1]
        : overId.split("-")[1]

      // Update the task startTime for preview
      const updatedTask: Task = {
        ...activeTask,
        calendarItem: {
          start: { date: targetDate },
          end: { date: targetDate }
        }
      }

      if (isOverCalendarHour) {
        const [, , hourStr] = isOverCalendarHour
        const hour = parseInt(hourStr, 10)
        updatedTask.calendarItem = {
          start: {
            date: targetDate,
            dateTime: `${targetDate}T${hour.toString().padStart(2, "0")}:00:00`
          },
          end: {
            date: targetDate,
            dateTime: `${targetDate}T${(hour + 1).toString().padStart(2, "0")}:00:00`
          }
        }
      }

      setPreviewTask(updatedTask)

      setLocalColumnTasks((prev: Record<string, Task[]>) => {
        const updated = structuredClone(prev)

        // Only remove from preview if not dragging from today column to today's calendar
        const isTodayCalendar =
          format(selectedDate, "yyyy-MM-dd") ===
          format(new Date(), "yyyy-MM-dd")
        const isDraggingFromToday = sourceColumnId === "today"

        if (!(isTodayCalendar && isDraggingFromToday)) {
          Object.keys(updated).forEach(date => {
            if (date !== overId) {
              updated[date] = updated[date].filter((t: Task) => t.id !== activeId)
            }
          })
        }

        return updated
      })

      setPreviewColumnId(overId)
      return
    } else {
      setIsDraggingOverCalendar(false)
    }

    // Get target column id either from sortable container or direct column id
    const targetColumnId =
      over.data.current?.sortable?.containerId?.split("-")[0] ||
      (typeof over.id === "string" && over.id.split("-")[0])

    setLocalColumnTasks((prev: Record<string, Task[]>) => {
      const updated = structuredClone(prev)

      // Remove from all dates for preview
      Object.keys(updated).forEach(date => {
        if (date !== targetColumnId && date !== sourceColumnId) {
          updated[date] = updated[date].filter((t: Task) => t.id !== activeId)
        }
      })

      // Add to preview date
      if (!updated[targetColumnId]) {
        updated[targetColumnId] = []
      }

      const overIndex = updated[targetColumnId].findIndex((t: Task) => t.id === overId)
      const indexToInsert =
        overIndex >= 0 ? overIndex : updated[targetColumnId].length

      const existingTaskIndex = updated[targetColumnId].findIndex(
        (t: Task) => t.id === activeId
      )
      if (existingTaskIndex !== -1) {
        updated[targetColumnId][existingTaskIndex] = activeTask
      } else {
        updated[targetColumnId].splice(indexToInsert, 0, activeTask)
      }

      return updated
    })

    setPreviewColumnId(targetColumnId)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    console.log("Drag end event:", event)
    console.log("Active task:", activeTask)
    if (!over) {
      setActiveTask(null)
      setIsDraggingOverChat(false)
      setIsDraggingOverCalendar(false)
      return
    }
    console.log("Over:", over)
    
    // Only handle the drop if it's on the chat
    if (over.id === "ai-chat-droppable" && activeTask) {
      console.log("Dropping on chat:", activeTask)
      const chatForm = document.querySelector("[data-droppable-id='ai-chat-droppable']")
      if (chatForm) {
        const taskDropEvent = new CustomEvent("taskdrop", { 
          detail: activeTask,
          bubbles: true // Make sure the event bubbles up
        })
        chatForm.dispatchEvent(taskDropEvent)
      }
    } else {
      console.log("Dropping on column")
      await handleDragEndOriginal(event)
    }

    // Clear states
    setActiveTask(null)
    setIsDraggingOverChat(false)
    setIsDraggingOverCalendar(false)
    setPreviewTask(null)
    setPreviewColumnId(null)
    setSourceColumnId(null)
  }

  async function handleDragEndOriginal(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !activeTask) return

    const targetColumnId =
      (over.data.current?.sortable?.containerId?.split("-")[0] as ColumnId) ||
      (over.id.toString().split("-")[0] as ColumnId)
    const isCalendarTarget = targetColumnId === "calendar"
    const targetDate = isCalendarTarget
      ? format(selectedDate, "yyyy-MM-dd")
      : null
    const isOverCalendarHour = over.id
      .toString()
      .match(/calendar-(.+)-hour-(\d+)/)

    console.log("Target column ID:", targetColumnId)
    console.log("Target date:", targetDate)
    console.log("Is over calendar hour:", isOverCalendarHour)

    // Handle calendar drops
    if (isCalendarTarget && targetDate) {
      try {
        const isTodayCalendar =
          format(selectedDate, "yyyy-MM-dd") ===
          format(new Date(), "yyyy-MM-dd")
        const isDraggingFromToday = sourceColumnId === "today"

        // Generate the gcalEventId upfront
        const gcalEventId =
          activeTask.calendarItem?.gcalEventId?.replace(/-/g, "") ||
          uuidv4().replace(/-/g, "")

        let updatedTask: Task = {
          ...activeTask,
          calendarItem: {
            gcalEventId,
            start: { date: targetDate },
            end: { date: targetDate }
          }
        }

        // If dropping on a specific hour, set the time respecting duration
        if (isOverCalendarHour) {
          const hour = parseInt(isOverCalendarHour[2], 10)
          const startDateTime = `${targetDate}T${hour.toString().padStart(2, "0")}:00:00`

          // Calculate end time based on task duration if it exists
          const endDateTime = activeTask.durationMinutes
            ? new Date(
                new Date(startDateTime).getTime() +
                  activeTask.durationMinutes * 60000
              ).toISOString()
            : `${targetDate}T${(hour + 1).toString().padStart(2, "0")}:00:00`

          updatedTask.calendarItem = {
            gcalEventId,
            start: {
              date: targetDate,
              dateTime: startDateTime
            },
            end: {
              date: targetDate,
              dateTime: endDateTime
            }
          }
        }

        // If dragging from backlog
        if (sourceColumnId === "backlog") {
          console.log("Moving from backlog to calendar")
          await deleteBacklogTask(activeTask.id)
          await addTasks(targetDate, [updatedTask])
        }
        // If dragging from today to today's calendar, just update the task
        else if (
          (isTodayCalendar && isDraggingFromToday) ||
          sourceColumnId === "calendar"
        ) {
          console.log("Updating today's task in calendar")
          await updateTask(activeTask.id, updatedTask)
        }
        // If dragging from incomplete or future
        else if (
          sourceColumnId === "incomplete" ||
          sourceColumnId === "future"
        ) {
          // First add to new date, then delete from old
          await addTasks(targetDate, [updatedTask])
          await deleteTask(activeTask.id)
        }
        // If dragging from any other day column
        else {
          await addTasks(targetDate, [updatedTask])
          await deleteTask(activeTask.id)
        }

        await refreshTasks()
        await refreshBacklog()
      } catch (error) {
        console.error("Error handling calendar drag end:", error)
      }
    }

    // Handle reordering within the same column
    const tasks = localColumnTasks[targetColumnId] || []
    const overIndex = tasks.findIndex(t => t.id === over.id)
    if (sourceColumnId === targetColumnId) {
      const oldIndex = tasks.findIndex(t => t.id === active.id)

      if (oldIndex !== -1 && overIndex !== -1) {
        const newTasks = [...tasks]
        const [movedTask] = newTasks.splice(oldIndex, 1)
        newTasks.splice(overIndex, 0, movedTask)

        setLocalColumnTasks(prev => ({
          ...prev,
          [targetColumnId]: newTasks
        }))

        // If in backlog, use backlog reorder function
        if (targetColumnId === "backlog") {
          await reorderBacklogTasks(newTasks.map(t => t.id))
        } else if (targetColumnId === "today") {
            const todayDate = format(new Date(), "yyyy-MM-dd")
          await reorderDayTasks(
            todayDate,
            newTasks.map(t => t.id)
          )
        }
      }
      setPreviewTask(null)
      setSourceColumnId(null)
      return
  }

    // Validate the drop is allowed for cross-column moves
    const isValidDrop =
      sourceColumnId && ALLOWED_DROPS[sourceColumnId]?.includes(targetColumnId)
    if (!isValidDrop) {
      console.log("Invalid drop target:", { sourceColumnId, targetColumnId })
      return
    }

    try {
      const todayDate = format(new Date(), "yyyy-MM-dd")
      //get source column delete function
      //switch on sourceColumnId    
      const sourceColumnDelete = async (taskId: string) => {
        switch(sourceColumnId){
          case "backlog":
            await deleteBacklogTask(taskId)
            break
          case "today":
            await deleteTask(taskId)
            await refreshTasks()
            break
          case "incomplete":
            await deleteTask(taskId)
            await refreshTasks()
            break
          case "future":
            await deleteTask(taskId)
            await refreshTasks()
            break
        }
      }
      const targetColumnAdd = async (tasks: Task[], insertIndex?: number) => {
        switch(targetColumnId){
          case "backlog":
            await addBacklogTasks(tasks, insertIndex)
            break
          case "today":
            await addTasks(todayDate, tasks)
            await refreshTasks()
            break
        }
      }

      //delete source column task
      sourceColumnDelete(activeTask.id)
      //add task to target column
      targetColumnAdd && targetColumnAdd([activeTask], overIndex)
    } catch (error) {
      console.error("Error handling drag end:", error)
    }

    // Clear previews and states
    clearPreviews()
    setPreviewColumnId(null)
    setIsDragging(false)
    setPreviewTask(null)
    setSourceColumnId(null)
  }

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {children}

      <DragOverlay>
        {activeTask ? (
          <div className={cn(
            isDraggingOverChat && "opacity-50",
            isDraggingOverCalendar && "opacity-50"
          )}>
            <TaskCard
              task={activeTask}
              day={{
                id: "today",
                date: new Date().toISOString(),
                tasks: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }}
              isOverCalendarZone={isDraggingOverCalendar}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}