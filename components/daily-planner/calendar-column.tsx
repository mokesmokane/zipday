import { useDroppable } from "@dnd-kit/core"
import { format, isToday } from "date-fns"
import { Resizable, ResizeDirection } from "re-resizable"
import type { Task } from "@/types/daily-task-types"
import type { CSSProperties } from "react"
import { useEffect, useState } from "react"

interface CalendarColumnProps {
  id: string
  date: string
  tasks: Task[]
  onAddTask: (hour: number) => void
  onResizeTask?: (taskId: string, durationMinutes: number) => void
}

const HOUR_HEIGHT = 60 // Height of each hour cell in pixels
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// Helper to calculate task position and height
function getTaskStyle(task: Task): CSSProperties | null {
  if (!task.startTime) return null
  
  const startDate = new Date(task.startTime)
  const startHour = startDate.getHours()
  const startMinute = startDate.getMinutes()
  const durationMinutes = task.durationMinutes || 60 // Default 1 hour if not specified
  
  const top = (startHour * HOUR_HEIGHT) + (startMinute / 60 * HOUR_HEIGHT)
  const height = (durationMinutes / 60) * HOUR_HEIGHT
  
  return {
    position: 'absolute' as const,
    top: `${top}px`,
    left: '32px',
    right: '8px',
    height: `${height}px`,
    minHeight: '30px'
  }
}

function CalendarTask({ task, onResize }: { 
  task: Task
  onResize?: (taskId: string, durationMinutes: number) => void 
}) {
  const style = getTaskStyle(task)
  if (!style) return null

  return (
    <Resizable
      style={style}
      defaultSize={{
        width: 'auto',
        height: `${(task.durationMinutes || 60) / 60 * HOUR_HEIGHT}px`
      }}
      enable={{ bottom: true }}
      grid={[1, 15]} // Snap to 15-minute intervals
      minHeight={30}
      maxHeight={HOUR_HEIGHT * 24}
      onResizeStop={(_e, _direction, ref, _d) => {
        const newHeight = parseInt(ref.style.height)
        const newDurationMinutes = Math.round((newHeight / HOUR_HEIGHT) * 60)
        onResize?.(task.id, newDurationMinutes)
      }}
    >
      <div className="bg-primary/10 rounded p-2 text-xs h-full overflow-hidden">
        <div className="font-medium">{task.title}</div>
        {task.description && (
          <div className="text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </div>
        )}
      </div>
    </Resizable>
  )
}

function HourDroppable({ id, hour, isOver }: {
  id: string
  hour: number
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({
    id: `${id}-hour-${hour}`
  })

  return (
    <div
      ref={setNodeRef}
      className={`relative border-b transition-colors ${isOver ? 'bg-accent' : 'hover:bg-accent/50'}`}
      style={{ height: `${HOUR_HEIGHT}px` }}
    >
      <div className="absolute left-2 top-0 text-xs text-muted-foreground">
        {hour.toString().padStart(2, "0")}:00
      </div>
    </div>
  )
}

function CurrentTimeLine() {
  const [position, setPosition] = useState(getTimePosition())

  function getTimePosition() {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    return (hours * HOUR_HEIGHT) + (minutes / 60 * HOUR_HEIGHT)
  }

  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setPosition(getTimePosition())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div 
      className="absolute left-0 right-0 pointer-events-none z-10"
      style={{ 
        top: `${position}px`,
        transition: 'top 0.5s linear'
      }}
    >
      <div className="relative flex items-center">
        <div className="absolute -left-1 w-2 h-2 rounded-full bg-red-500" />
        <div className="w-full border-t border-red-500" />
      </div>
    </div>
  )
}

export function CalendarColumn({ id, date, tasks, onAddTask, onResizeTask }: CalendarColumnProps) {
  const isCurrentDay = isToday(new Date(date))

  return (
    <div className="bg-muted/50 flex h-full w-full flex-col rounded-lg border">
      <div className="border-b p-2 text-center">
        <div className="font-semibold">
          {format(new Date(date), "EEEE")}
        </div>
        <div className="text-sm text-muted-foreground">
          {format(new Date(date), "MMM d")}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {HOURS.map(hour => (
          <HourDroppable
            key={hour}
            id={id}
            hour={hour}
            isOver={false}
          />
        ))}
        
        {tasks.map(task => (
          <CalendarTask 
            key={task.id} 
            task={task}
            onResize={onResizeTask}
          />
        ))}

        {isCurrentDay && <CurrentTimeLine />}
      </div>
    </div>
  )
} 
