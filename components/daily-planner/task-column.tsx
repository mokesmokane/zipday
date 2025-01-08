"use client"

import { useDroppable } from "@dnd-kit/core"
import { motion } from "framer-motion"
import { Trash2 } from "lucide-react"

interface TaskColumnProps {
  id: string
  children: React.ReactNode
  isDragging: boolean
  isOverDeleteZone: boolean
  showDeleteZone: boolean
}

export function TaskColumn({ 
  id, 
  children, 
  isDragging, 
  isOverDeleteZone,
  showDeleteZone
}: TaskColumnProps) {
  const { setNodeRef: setColumnRef } = useDroppable({ id })
  const { setNodeRef: setDeleteZoneRef } = useDroppable({ 
    id: `${id}-delete-zone`
  })

  return (
    <div
      ref={setColumnRef}
      className="bg-muted/50 flex min-h-[200px] flex-col rounded-lg border p-4"
    >
      <div className="flex-1 space-y-4">
        {children}
      </div>

      {isDragging && showDeleteZone && (
        <motion.div
          ref={setDeleteZoneRef}
          id={`${id}-delete-zone`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ 
            opacity: 1, 
            height: "auto",
            backgroundColor: isOverDeleteZone ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)"
          }}
          transition={{ duration: 0.2 }}
          className="border-destructive mt-4 flex items-center justify-center rounded-md border-2 border-dashed p-4"
        >
          <motion.div
            animate={{ 
              scale: isOverDeleteZone ? 1.2 : 1,
              color: isOverDeleteZone ? "rgb(239, 68, 68)" : "rgb(239, 68, 68, 0.8)"
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
