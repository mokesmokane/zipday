const HOUR_HEIGHT = 60

export function TimeLabels() {
  return (
    <div className="pointer-events-none absolute left-0 top-0 h-full w-12">
      {Array.from({ length: 24 }, (_, hour) => (
        <div
          key={hour}
          className={`absolute left-0 w-full ${hour < 23 ? "border-b" : ""} text-muted-foreground flex items-start px-2 text-xs`}
          style={{
            top: `${hour * HOUR_HEIGHT}px`,
            height: `${HOUR_HEIGHT}px`
          }}
        >
          <span className="pt-1">{hour.toString().padStart(2, "0")}:00</span>
        </div>
      ))}
    </div>
  )
}
