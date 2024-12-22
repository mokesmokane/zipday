"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { useDate } from "@/lib/context/date-context"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface CalendarProps {
  isExpanded: boolean
}

export function SidebarCalendar({ isExpanded }: CalendarProps) {
  const { selectedDate, setSelectedDate } = useDate()

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

  if (!isExpanded) {
    return (
      <div className="flex justify-center p-2">
        <CalendarIcon className="size-6" />
      </div>
    )
  }

  return (
    <Card className="w-full border-none shadow-none">
      <CardContent className="p-3">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
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
        />
      </CardContent>
    </Card>
  )
}
