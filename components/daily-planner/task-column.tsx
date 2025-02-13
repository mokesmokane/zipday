"use client"

import { useDroppable } from "@dnd-kit/core"
import { motion } from "framer-motion"
import { Calendar } from "lucide-react"
import { useState, useEffect } from "react"
import type { Task } from "@/types/daily-task-types"
import { TaskCard } from "./task-card"
import { parseTaskInput } from "@/lib/utils/task-parser"
import { AIInput } from "../ai-input/ai-input"
import { usePreviewTasks } from "@/lib/context/preview-tasks-context"

interface TaskColumnProps {
  id: string
  children: React.ReactNode
  isDragging: boolean
  isOverCalendarZone: boolean
  showCalendarZone: boolean
  onAddTasks?: (tasks: Task[]) => void
}

export function TaskColumn({
  id,
  children,
  isDragging,
  isOverCalendarZone,
  showCalendarZone,
  onAddTasks
}: TaskColumnProps) {
  const { setNodeRef: setColumnRef } = useDroppable({ id })
  const { setNodeRef: setCalendarZoneRef } = useDroppable({
    id: `${id}-calendar-zone`
  })

  const { previewTasks, setPreviewTasksForColumn, clearPreviewTasks } = usePreviewTasks()
  const columnPreviewTasks = previewTasks[id] || []
  //if id is a date, use that date, otherwise use today's date
  let currentDate = undefined
  if (id.match(/^\d{4}-\d{2}-\d{2}$/)) {
    currentDate = id
  }
  return (
    <div
      ref={setColumnRef}
      className="bg-muted/50 flex  h-[calc(100vh-8rem)] flex-col rounded-lg border p-4"
    >
      <div className="scrollbar-hide flex-1 space-y-4 overflow-y-auto">
        {children}

        {/* Preview section */}
        {columnPreviewTasks.length > 0 && (
          <div className="space-y-4 opacity-50">
            {columnPreviewTasks.map(task => (
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
      ) : onAddTasks ? (
        <div className="mt-4">
          <AIInput
            onSubmit={() => {
              onAddTasks(columnPreviewTasks)
              clearPreviewTasks(id)
            }}
            currentDate={currentDate}
            onValueChanged={(tasks) => {
              setPreviewTasksForColumn(id, tasks)
            }}
            placeholder={`Title
- subtask
- another subtask
#category
@9:30
1h30m`}
          />
        </div>
      ) : null}
    </div>
  )
}
