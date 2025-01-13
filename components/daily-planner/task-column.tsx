"use client"

import { useDroppable } from "@dnd-kit/core"
import { motion } from "framer-motion"
import { Trash2 } from "lucide-react"

interface TaskColumnProps {
  id: string
  children: React.ReactNode
  isDragging: boolean
  isOverCalendarZone: boolean
  showCalendarZone: boolean
}

export function TaskColumn({ 
  id, 
  children, 
  isDragging, 
  isOverCalendarZone,
  showCalendarZone
}: TaskColumnProps) {
  const { setNodeRef: setColumnRef } = useDroppable({ id })
  const { setNodeRef: setCalendarZoneRef } = useDroppable({ 
    id: `${id}-calendar-zone`
  })

  return (
    <div
      ref={setColumnRef}
      className="bg-muted/50 flex min-h-[200px] flex-col rounded-lg border p-4"
    >
      <div className="flex-1 space-y-4">
        {children}
      </div>

      {isDragging && showCalendarZone && (
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
            <Trash2 className="h-6 w-6" />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
