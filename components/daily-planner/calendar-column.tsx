import { useDroppable } from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format, isToday, parseISO } from "date-fns"
import { Resizable, ResizeDirection } from "re-resizable"
import type { Task } from "@/types/daily-task-types"
import type { CSSProperties } from "react"
import { useEffect, useState } from "react"
import { useGoogleCalendar } from "@/lib/context/google-calendar-context"
import { Badge } from "@/components/ui/badge"

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

// Helper to calculate Google Calendar event position and height
function getEventStyle(startTime: string, endTime: string): CSSProperties {
  const startDate = parseISO(startTime)
  const endDate = parseISO(endTime)
  
  const startHour = startDate.getHours()
  const startMinute = startDate.getMinutes()
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  
  const top = (startHour * HOUR_HEIGHT) + (startMinute / 60 * HOUR_HEIGHT)
  const height = (durationMinutes / 60) * HOUR_HEIGHT
  
  return {
    position: 'absolute' as const,
    top: `${top}px`,
    left: '8px',
    right: '32px',
    height: `${height}px`,
    minHeight: '30px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px dashed rgb(59, 130, 246)',
    borderRadius: '4px',
    padding: '4px',
    fontSize: '12px',
    pointerEvents: 'none'
  }
}

function CalendarTask({ task, onResize }: { 
  task: Task
  onResize?: (taskId: string, durationMinutes: number) => void 
}) {
  const style = getTaskStyle(task)
  if (!style) return null

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: task.id,
    data: {
      type: 'calendar-task',
      task
    }
  })

  const dragStyle = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    touchAction: 'none'
  }

  return (
    <Resizable
      style={dragStyle}
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
      <div 
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="bg-primary/10 rounded p-2 text-xs h-full overflow-hidden select-none"
      >
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

function GoogleCalendarEvent({ title, startTime, endTime }: {
  title: string
  startTime: string
  endTime: string
}) {
  const style = getEventStyle(startTime, endTime)

  return (
    <div style={style}>
      <Badge variant="outline" className="text-xs mb-1">Google Calendar</Badge>
      <div className="font-medium line-clamp-2">{title}</div>
    </div>
  )
}

function HourDroppable({ id, hour, isOver }: {
  id: string
  hour: number
  isOver: boolean
}) {
  const { setNodeRef, isOver: isOverHour } = useDroppable({
    id: `${id}-hour-${hour}`
  })

  return (
    <div
      ref={setNodeRef}
      className={`relative border-b transition-colors ${isOverHour ? 'bg-accent' : 'hover:bg-accent/50'}`}
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
  const { events } = useGoogleCalendar()

  // Filter events for this day
  const dayEvents = events.filter(event => {
    const eventDate = parseISO(event.startTime)
    return format(eventDate, "yyyy-MM-dd") === date
  })

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

        {dayEvents.map(event => (
          <GoogleCalendarEvent
            key={event.id}
            title={event.title}
            startTime={event.startTime}
            endTime={event.endTime}
          />
        ))}

        {isCurrentDay && <CurrentTimeLine />}
      </div>
    </div>
  )
} 
