"use client"

import { useDroppable } from "@dnd-kit/core"
import { motion } from "framer-motion"
import { Calendar } from "lucide-react"
import { useState } from "react"
import type { Task } from "@/types/daily-task-types"
import { Textarea } from "../ui/textarea"
import { TaskCard } from "./task-card"
import { parseTaskInput } from "@/lib/utils/task-parser"

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift+Enter: insert new line at cursor position
        e.preventDefault()
        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const end = textarea.selectionEnd

        setInputValue(
          prev => prev.substring(0, start) + "\n" + prev.substring(end)
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
      className="bg-muted/50 flex  h-[calc(100vh-8rem)] flex-col rounded-lg border p-4"
    >
      <div className="scrollbar-hide flex-1 space-y-4 overflow-y-auto">
        {children}

        {/* Preview section */}
        {previewTasks.length > 0 && (
          <div className="space-y-4 opacity-50">
            {previewTasks.map(task => (
              <TaskCard key={task.id} task={task} isOverCalendarZone={false} />
            ))}
          </div>
        )}
      </div>

      {isDragging && showCalendarZone ? (
        <motion.div
          ref={setCalendarZoneRef}
          id={`${id}-calendar-zone`}
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: 1,
            height: "auto",
            backgroundColor: isOverCalendarZone
              ? "rgba(59, 130, 246, 0.2)"
              : "rgba(59, 130, 246, 0.1)"
          }}
          transition={{ duration: 0.2 }}
          className="mt-4 flex items-center justify-center rounded-md border-2 border-dashed border-blue-500 p-4"
        >
          <motion.div
            animate={{
              scale: isOverCalendarZone ? 1.5 : 1,
              color: isOverCalendarZone
                ? "rgb(59, 130, 246)"
                : "rgba(59, 130, 246, 0.8)"
            }}
            transition={{ duration: 0.2 }}
          >
            <Calendar className="size-6" />
          </motion.div>
        </motion.div>
      ) : onAddTask ? (
        <div className="mt-4">
          <Textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Title
- subtask
- another subtask
#category
@9:30
1h30m`}
            className="min-h-[130px] resize-none"
            rows={6}
          />
        </div>
      ) : null}
    </div>
  )
}
