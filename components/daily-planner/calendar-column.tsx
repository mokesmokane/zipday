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
function getTaskStyle(task: Task, index: number, total: number): CSSProperties | null {
  if (!task.startTime) return null
  
  const startDate = new Date(task.startTime)
  const startHour = startDate.getHours()
  const startMinute = startDate.getMinutes()
  const durationMinutes = task.durationMinutes || 60
  
  const top = (startHour * HOUR_HEIGHT) + (startMinute / 60 * HOUR_HEIGHT)
  const height = (durationMinutes / 60) * HOUR_HEIGHT
  
  const width = `${100 / total}%`
  const left = `calc(32px + ${(index * 100) / total}%)`
  
  return {
    position: 'absolute' as const,
    top: `${top}px`,
    left,
    width,
    height: `${height}px`,
    minHeight: '30px'
  }
}

// Helper to calculate Google Calendar event position and height
function getEventStyle(startTime: string, endTime: string, index: number, total: number): CSSProperties {
  const startDate = parseISO(startTime)
  const endDate = parseISO(endTime)
  
  const startHour = startDate.getHours()
  const startMinute = startDate.getMinutes()
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  
  const top = (startHour * HOUR_HEIGHT) + (startMinute / 60 * HOUR_HEIGHT)
  const height = (durationMinutes / 60) * HOUR_HEIGHT
  
  const width = `${100 / total}%`
  const left = `calc(8px + ${(index * 100) / total}%)`
  
  return {
    position: 'absolute' as const,
    top: `${top}px`,
    left,
    width,
    height: `${height}px`,
    minHeight: '30px',
    backgroundColor: 'lightgreen',
    border: '1px dashed grey',
    borderRadius: '4px',
    padding: '4px',
    fontSize: '12px',
    pointerEvents: 'none'
  }
}

function CalendarTask({ task, onResize, position }: { 
  task: Task
  onResize?: (taskId: string, durationMinutes: number) => void 
  position: {index: number, total: number}
}) {
  const style = getTaskStyle(task, position.index, position.total)
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

function GoogleCalendarEvent({ title, startTime, endTime, allDay, position }: {
  title: string
  startTime: string
  endTime: string
  allDay?: boolean
  position: {index: number, total: number}
}) {
  if (allDay) {
    return (
      <div className="px-2 py-1 mb-2 bg-accent/20 border border-dashed border-accent rounded-md">
        <Badge variant="outline" className="text-xs mb-1">All Day</Badge>
        <div className="font-medium line-clamp-2 text-xs">{title}</div>
      </div>
    )
  }

  const style = getEventStyle(startTime, endTime, position.index, position.total)
  return (
    <div style={style}>
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

// Add this helper function to calculate overlapping groups
function getOverlappingGroups(items: Array<{startTime?: string, endTime?: string, durationMinutes?: number}>) {
  const groups: Array<Array<number>> = []
  
  items.filter(item => item.startTime).forEach((item, index) => {
    const itemStart = new Date(item.startTime!).getTime()
    let foundGroup = false
    
    for (const group of groups) {
      const firstItemInGroup = items[group[0]]
      const groupStartTime = new Date(firstItemInGroup.startTime!).getTime()
      
      // Only group items with exactly the same start time
      if (itemStart === groupStartTime) {
        group.push(index)
        foundGroup = true
        break
      }
    }
    
    if (!foundGroup) {
      groups.push([index])
    }
  })
  
  return groups
}

export function CalendarColumn({ id, date, tasks, onAddTask, onResizeTask }: CalendarColumnProps) {
  const isCurrentDay = isToday(new Date(date))
  const { events } = useGoogleCalendar()

  // Filter events for this day
  const dayEvents = events?.filter(event => {
    const eventDate = parseISO(event.startTime)
    return format(eventDate, "yyyy-MM-dd") === date
  }) || []

  // Separate all-day and timed events
  const allDayEvents = dayEvents.filter(event => event.allDay)
  const timedEvents = dayEvents.filter(event => !event.allDay)

  // Combine tasks and events for overlap calculation
  const allItems = [...tasks, ...timedEvents]
  const overlappingGroups = getOverlappingGroups(allItems)
  
  // Create a map of item index to its position info
  const positionMap = new Map<number, {index: number, total: number}>()
  overlappingGroups.forEach(group => {
    group.forEach((itemIndex, positionIndex) => {
      positionMap.set(itemIndex, {
        index: positionIndex,
        total: group.length
      })
    })
  })

  return (
    <div className="bg-muted/50 flex h-full w-full flex-col rounded-lg border">
      <div className="border-b p-2">
        <div className="font-semibold text-center">
          {format(new Date(date), "EEEE")}
        </div>
        <div className="text-sm text-muted-foreground text-center">
          {format(new Date(date), "MMM d")}
        </div>
        {allDayEvents.length > 0 && (
          <div className="mt-2 space-y-1">
            {allDayEvents.map(event => (
              <GoogleCalendarEvent
                key={event.id}
                title={event.title}
                startTime={event.startTime}
                endTime={event.endTime}
                allDay={true}
                position={{ index: 0, total: 1 }}
              />
            ))}
          </div>
        )}
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
        
        {tasks.map((task, idx) => {
          const position = positionMap.get(idx) || { index: 0, total: 1 }
          return (
            <CalendarTask 
              key={task.id} 
              task={task}
              onResize={onResizeTask}
              position={position}
            />
          )
        })}

        {timedEvents.map((event, idx) => {
          const position = positionMap.get(idx + tasks.length) || { index: 0, total: 1 }
          return (
            <GoogleCalendarEvent
              key={event.id}
              title={event.title}
              startTime={event.startTime}
              endTime={event.endTime}
              allDay={false}
              position={position}
            />
          )
        })}

        {isCurrentDay && <CurrentTimeLine />}
      </div>
    </div>
  )
} 
