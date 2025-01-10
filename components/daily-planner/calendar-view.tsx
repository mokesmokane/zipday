"use client"

import React, { useState } from 'react'
import { format, addDays, startOfWeek, } from 'date-fns'
import { Day, Task } from '@/types/daily-task-types'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarViewProps {
  days: Record<string, Day>
  onAddTask: (date: Date, hour: number) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarView({ days, onAddTask }: CalendarViewProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()))

  const handlePrevWeek = () => setCurrentWeek(addDays(currentWeek, -7))
  const handleNextWeek = () => setCurrentWeek(addDays(currentWeek, 7))

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          {format(currentWeek, 'MMMM d, yyyy')} - {format(addDays(currentWeek, 6), 'MMMM d, yyyy')}
        </h2>
        <div>
          <Button onClick={handlePrevWeek} variant="outline" size="icon" className="mr-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={handleNextWeek} variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-16 flex-shrink-0">
          {HOURS.map(hour => (
            <div key={hour} className="h-12 flex items-center justify-end pr-2 text-sm text-gray-500">
              {hour}:00
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-x-auto">
          <div className="flex" style={{ width: `${DAYS_OF_WEEK.length * 200}px` }}>
            {DAYS_OF_WEEK.map((day, index) => {
              const date = addDays(currentWeek, index)
              const dateString = format(date, 'yyyy-MM-dd')
              const dayTasks = days[dateString]?.tasks || []
              console.log("dayTasks", dayTasks)
              return (
                <div key={day} className="flex-1 min-w-[200px] border-l">
                  <div className="h-8 flex items-center justify-center font-semibold border-b">
                    {day} {format(date, 'd')}
                  </div>
                  {HOURS.map(hour => {
                    const hourTasks = dayTasks.filter((task: Task) => {
                      const taskHour = parseInt(task.time?.split(':')[0] || '0', 10)
                      return taskHour === hour
                    })

                    return (
                      <div
                        key={hour}
                        className="h-12 border-b relative"
                        onClick={() => onAddTask(date, hour)}
                      >
                        {hourTasks.map((task: Task) => (
                          <div
                            key={task.id}
                            className="absolute left-0 right-0 bg-blue-200 p-1 text-xs overflow-hidden"
                            style={{
                              top: '0',
                              height: `${task.time || 1 * 48}px`,
                            }}
                          >
                            {task.title}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

