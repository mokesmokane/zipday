import { useDroppable } from "@dnd-kit/core"
import { format } from "date-fns"
import type { Task } from "@/types/daily-task-types"

interface CalendarColumnProps {
  id: string
  date: string
  tasks: Task[]
  onAddTask: (hour: number) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function HourDroppable({ id, hour, tasks, onAddTask, isOver }: {
  id: string
  hour: number
  tasks: Task[]
  onAddTask: (hour: number) => void
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({
    id: `${id}-hour-${hour}`
  })

  return (
    <div
      ref={setNodeRef}
      className={`group relative border-b p-1 transition-colors ${isOver ? 'bg-accent' : 'hover:bg-accent/50'}`}
      style={{ height: "60px" }}
      onClick={() => onAddTask(hour)}
    >
      <div className="absolute left-0 top-0 text-xs text-muted-foreground">
        {hour.toString().padStart(2, "0")}:00
      </div>
      
      {tasks.map(task => (
        <div
          key={task.id}
          className="ml-8 rounded bg-primary/10 px-2 py-1 text-xs"
        >
          {task.title}
        </div>
      ))}
    </div>
  )
}

export function CalendarColumn({ id, date, tasks, onAddTask }: CalendarColumnProps) {
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

      <div className="flex-1 overflow-y-auto">
        {HOURS.map(hour => {
          const hourTasks = tasks.filter(task => {
            if (!task.start) return false
            const taskHour = parseInt(task.start?.split(":")[0] || "0", 10)
            return taskHour === hour
          })

          return (
            <HourDroppable
              key={hour}
              id={id}
              hour={hour}
              tasks={hourTasks}
              onAddTask={onAddTask}
              isOver={false}
            />
          )
        })}
      </div>
    </div>
  )
} 
