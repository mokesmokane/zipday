const HOUR_HEIGHT = 60

export function TimeLabels() {
  return (
    <div className="absolute left-0 top-0 w-12 h-full pointer-events-none">
      {Array.from({ length: 24 }, (_, hour) => (
        <div 
          key={hour}
          className={`absolute left-0 w-full ${hour < 23 ? 'border-b' : ''} text-xs text-muted-foreground px-2 flex items-start`}
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