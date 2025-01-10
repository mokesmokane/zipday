"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { Calendar as CalendarIcon, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { useDate } from "@/lib/context/date-context"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/lib/context/sidebar-context"


export function SidebarCalendar() {
  const { selectedDate, setSelectedDate } = useDate()
  const [isPoppedOut, setIsPoppedOut] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 300, height: 350 })
  const [isResizing, setIsResizing] = useState(false)
  const resizeDirection = useRef<string | null>(null)
  const initialSize = useRef({ width: 0, height: 0 })
  const initialPosition = useRef({ x: 0, y: 0 })
  const [month, setMonth] = useState<Date>(new Date())
  const {isExpanded} = useSidebar()

  // Example dates with content - replace with actual data later
  const datesWithContent = [
    new Date(2024, 2, 10),
    new Date(2024, 2, 15),
    new Date(2024, 2, 20)
  ]

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPoppedOut) return
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    const newX = e.clientX - dragOffset.current.x
    const newY = e.clientY - dragOffset.current.y
    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  const handleResizeMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    direction: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeDirection.current = direction
    initialSize.current = { width: size.width, height: size.height }
    initialPosition.current = { x: e.clientX, y: e.clientY }
  }

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return
    const dx = e.clientX - initialPosition.current.x
    const dy = e.clientY - initialPosition.current.y

    switch (resizeDirection.current) {
      case "e":
        setSize(prev => ({
          ...prev,
          width: Math.max(300, initialSize.current.width + dx)
        }))
        break
      case "s":
        setSize(prev => ({
          ...prev,
          height: Math.max(400, initialSize.current.height + dy)
        }))
        break
      case "se":
        setSize({
          width: Math.max(300, initialSize.current.width + dx),
          height: Math.max(400, initialSize.current.height + dy)
        })
        break
    }
  }

  const handleResizeUp = () => {
    setIsResizing(false)
    resizeDirection.current = null
  }

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove)
      window.addEventListener("mouseup", handleResizeUp)
    }
    return () => {
      window.removeEventListener("mousemove", handleResizeMove)
      window.removeEventListener("mouseup", handleResizeUp)
    }
  }, [isResizing])

  const handlePreviousMonth = () => {
    setMonth(prevMonth => {
      const newMonth = new Date(prevMonth)
      newMonth.setMonth(newMonth.getMonth() - 1)
      return newMonth
    })
  }

  const handleNextMonth = () => {
    setMonth(prevMonth => {
      const newMonth = new Date(prevMonth)
      newMonth.setMonth(newMonth.getMonth() + 1)
      return newMonth
    })
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleString(undefined, {
      month: "long",
      year: "numeric"
    })
  }
  

  const calendarContent = (
    <DayPicker
      mode="single"
      selected={selectedDate}
      onSelect={handleSelect}
      month={month}
      onMonthChange={setMonth}
      formatters={{
        formatWeekdayName: day => day.toString().charAt(0)
      }}
      showOutsideDays={true}
      modifiers={{
        hasContent: datesWithContent
      }}
      modifiersStyles={{
        hasContent: {
          fontWeight: "bold",
          position: "relative"
        }
      }}
      className="w-full"
      classNames={{
        months: "w-full",
        month: "w-full",
        caption: "flex justify-between pl-2 py-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "size-7 bg-transparent px-3 opacity-50 hover:opacity-100 [&_svg]:size-3"
        ),
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full justify-between",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] uppercase",
        row: "flex w-full mt-2 justify-between",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-transparent",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-range-start)]:rounded-l-md"
        ),
        day: cn(
          "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground size-8 rounded-full p-0 font-normal aria-selected:opacity-100",
          "transition-all duration-200 ease-in-out"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-25",
        day_disabled: "text-muted-foreground opacity-50",
        day_hidden: "invisible hidden",
        day_range_start: "rounded-full",
        day_range_end: "rounded-full",
        day_range_middle: "rounded-full"
      }}
      components={{
        Caption: ({ displayMonth }) => (
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4" />
              <span className="text-sm font-medium">
                {displayMonth.toLocaleString(undefined, {
                  month: "long",
                  year: "numeric"
                })}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 bg-transparent px-3 opacity-50 hover:opacity-100 [&_svg]:size-3"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 bg-transparent px-3 opacity-50 hover:opacity-100 [&_svg]:size-3"
                onClick={handleNextMonth}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPoppedOut(true)}
                className="size-7 opacity-50 hover:opacity-100"
              >
                <Maximize2 className="size-3" />
              </Button>
            </div>
          </div>
        )
      }}
    />
  )

  if (isPoppedOut) {
    return (
      <div
      className="fixed z-50 flex flex-col rounded border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
      style={{
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        position: "fixed"
      }}
    >
      <div
        className="flex shrink-0 cursor-move items-center border-b border-gray-300 bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-800"
        onMouseDown={handleMouseDown}
      >
        <CalendarIcon className="size-5" />
        <span className="ml-2 flex-1 text-sm font-medium">{formatMonth(month)}</span>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 bg-transparent opacity-50 hover:opacity-100"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 bg-transparent opacity-50 hover:opacity-100"
            onClick={handleNextMonth}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPoppedOut(false)}
            className="size-8 rounded-full hover:bg-blue-100 hover:text-blue-600"
          >
            <Minimize2 className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          formatters={{
            formatWeekdayName: day => day.toString().charAt(0)
          }}
          showOutsideDays={true}
          modifiers={{
            hasContent: datesWithContent
          }}
          modifiersStyles={{
            hasContent: {
              fontWeight: "bold",
              position: "relative"
            }
          }}
          className="w-full"
          classNames={{
            months: "w-full",
            month: "w-full",
            caption: "hidden", // Hide the default caption since we moved controls to header
            table: "w-full border-collapse space-y-1",
            head_row: "flex w-full justify-between",
            head_cell:
              "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] uppercase",
            row: "flex w-full mt-2 justify-between",
            cell: cn(
              "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-transparent",
              "[&:has([aria-selected].day-range-end)]:rounded-r-md",
              "[&:has([aria-selected].day-range-start)]:rounded-l-md"
            ),
            day: cn(
              "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground size-8 rounded-full p-0 font-normal aria-selected:opacity-100",
              "transition-all duration-200 ease-in-out"
            ),
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "text-muted-foreground opacity-25",
            day_disabled: "text-muted-foreground opacity-50",
            day_hidden: "invisible hidden",
            day_range_start: "rounded-full",
            day_range_end: "rounded-full",
            day_range_middle: "rounded-full"
          }}
        />
      </div>
  
      {/* Resize handles */}
      <div
        className="absolute inset-y-0 right-0 w-2 cursor-e-resize hover:bg-gray-300/20"
        onMouseDown={e => handleResizeMouseDown(e, "e")}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-2 cursor-s-resize hover:bg-gray-300/20"
        onMouseDown={e => handleResizeMouseDown(e, "s")}
      />
      <div
        className="absolute bottom-0 right-0 size-4 cursor-se-resize hover:bg-gray-300/20"
        onMouseDown={e => handleResizeMouseDown(e, "se")}
      />
    </div>
    )
  }


  if (!isExpanded) {
    return (
      <div className="flex justify-center p-2">

        <Button
          variant="ghost" 
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-accent size-10"
          onClick={() => setIsPoppedOut(true)}
        >
          <CalendarIcon className="size-4" />
        </Button>
        </div>
    )
  }
  return (
    
    <Card className="relative w-full border-none shadow-none">
    <CardContent className="p-3">
      {calendarContent}
    </CardContent>
  </Card>
  )
}
