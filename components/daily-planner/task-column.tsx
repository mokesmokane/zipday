"use client"

import { useDroppable } from "@dnd-kit/core"
import { motion } from "framer-motion"
import { Calendar } from "lucide-react"
import { useState, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import type { Task } from "@/types/daily-task-types"
import { Textarea } from "../ui/textarea"
import { TaskCard } from "./task-card"
import { cn } from "@/lib/utils"

interface TaskColumnProps {
  id: string
  children: React.ReactNode
  isDragging: boolean
  isOverCalendarZone: boolean
  showCalendarZone: boolean
  onAddTask?: (task: Task) => void
}

export function TaskColumn({ 
  id, 
  children, 
  isDragging, 
  isOverCalendarZone,
  showCalendarZone,
  onAddTask
}: TaskColumnProps) {
  const { setNodeRef: setColumnRef } = useDroppable({ id })
  const { setNodeRef: setCalendarZoneRef } = useDroppable({ 
    id: `${id}-calendar-zone`
  })

  const [inputValue, setInputValue] = useState("")

  const parseTaskInput = useCallback((input: string) => {
    const tasks: Task[] = []
    const taskBlocks = input.split("\n\n").filter(Boolean)

    for (const block of taskBlocks) {
      const lines = block.split("\n")
      if (lines.length === 0) continue

      const title = lines[0].trim()
      let subtasks = []
      let tags = []
      let durationMinutes = undefined
      let calendarItem = undefined
      let description = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.startsWith("-")) {
          // Subtask
          subtasks.push({
            id: uuidv4(),
            text: line.slice(1).trim(),
            completed: false
          })
        } else if (line.startsWith("#")) {
          // Tag
          tags.push(line.slice(1).trim())
        } else if (line.match(/^\d+m$/)) {
          // Duration in minutes
          durationMinutes = parseInt(line)
        } else if (line.startsWith("@")) {
          // Time in @HH:MM format
          const timeMatch = line.match(/@(\d{1,2}):(\d{2})/)
          if (timeMatch) {
            const [_, hours, minutes] = timeMatch
            const date = new Date()
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0)
            calendarItem = {
              start: {
                dateTime: date.toISOString()
              }
            }
          }
        } else if (line) {
          // Any other non-empty line goes to description
          description.push(line)
        }
      }

      const now = new Date().toISOString()
      tasks.push({
        id: uuidv4(),
        title,
        description: description.length > 0 ? description.join("\n") : undefined,
        subtasks,
        tags,
        durationMinutes,
        calendarItem,
        completed: false,
        createdAt: now,
        updatedAt: now
      })
    }

    return tasks
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift+Enter: insert new line at cursor position
        e.preventDefault()
        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        
        setInputValue(prev => 
          prev.substring(0, start) + "\n" + prev.substring(end)
        )
        
        // Set cursor position after the inserted newline
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1
        }, 0)
      } else {
        // Enter: create task(s)
        e.preventDefault()
        const tasks = parseTaskInput(inputValue)
        tasks.forEach(task => onAddTask?.(task))
        setInputValue("")
      }
    }
  }

  // Get preview tasks from current input
  const previewTasks = parseTaskInput(inputValue)

  return (
    <div
      ref={setColumnRef}
      className="bg-muted/50 flex min-h-[200px] flex-col rounded-lg border p-4"
    >
      <div className="flex-1 space-y-4">
        {children}
      </div>

      {/* Preview section */}
      {previewTasks.length > 0 && (
        <div className="mt-4 space-y-4 opacity-50">
          {previewTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isOverCalendarZone={false}
            />
          ))}
        </div>
      )}

      {isDragging && showCalendarZone ? (
        <motion.div
          ref={setCalendarZoneRef}
          id={`${id}-calendar-zone`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ 
            opacity: 1, 
            height: "auto",
            backgroundColor: isOverCalendarZone ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)"
          }}
          transition={{ duration: 0.2 }}
          className="mt-4 flex items-center justify-center rounded-md border-2 border-dashed border-blue-500 p-4"
        >
          <motion.div
            animate={{ 
              scale: isOverCalendarZone ? 1.5 : 1,
              color: isOverCalendarZone ? "rgb(59, 130, 246)" : "rgba(59, 130, 246, 0.8)"
            }}
            transition={{ duration: 0.2 }}
          >
            <Calendar className="h-6 w-6" />
          </motion.div>
        </motion.div>
      ) : onAddTask ? (
        <div className="mt-4">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Title
- subtask
- another subtask
#category
@9:30
45m`}
            className="min-h-[130px] resize-none"
            rows={6}
          />
        </div>
      ) : null}
    </div>
  )
}
