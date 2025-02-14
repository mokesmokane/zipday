import { getHoursForRange } from "./utils"

const HOUR_HEIGHT = 60

interface TimeLabelsProps {
  timeRange: 'business' | 'all'
}

export function TimeLabels({ timeRange }: TimeLabelsProps) {
  const hours = getHoursForRange(timeRange)
  const firstHour = hours[0]
  
  return (
    <div className="pointer-events-none absolute left-0 top-0 h-full w-12">
      {hours.map((hour, index) => {
        const isBusinessHour = hour >= 9 && hour <= 17
        const isLateNightEarlyMorning = hour <= 5 || hour >= 22
        return (
          <div
            key={hour}
            className={`absolute left-0 w-full border-b ${
              isBusinessHour 
                ? "text-muted-foreground" 
                : isLateNightEarlyMorning
                  ? "bg-gray-200/65 dark:bg-gray-700 text-muted-foreground"
                  : "bg-muted text-muted-foreground"
            } flex items-start px-2 text-xs`}
            style={{
              top: `${(hour - firstHour) * HOUR_HEIGHT}px`,
              height: `${HOUR_HEIGHT}px`
            }}
          >
            <span className="pt-1">{hour.toString().padStart(2, "0")}:00</span>
          </div>
        )
      })}
    </div>
  )
}
