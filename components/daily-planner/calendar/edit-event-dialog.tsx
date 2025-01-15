'use client'

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EditEventDialogProps {
  event: {
    id: string
    title: string
    startTime?: string
    endTime?: string
    description?: string
  } | null
  isOpen: boolean
  onClose: () => void
  onSave: (event: { title: string; startTime: string; endTime: string; description: string }) => void
  onDelete?: (eventId: string) => void
  onConvertToTask?: (event: { 
    title: string
    startTime: string
    endTime: string
    description: string 
  }) => void
}

const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4)
  const minute = (i % 4) * 15
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
})

export function EditEventDialog({ event, isOpen, onClose, onSave, onDelete, onConvertToTask }: EditEventDialogProps) {
  const [title, setTitle] = useState(event?.title || "")
  const [startTime, setStartTime] = useState<string|null>(event?.startTime?.split('T')[1].slice(0, 5) || "09:00")
  const [endTime, setEndTime] = useState<string|null>(event?.endTime?.split('T')[1].slice(0, 5) || "17:00")
  const [description, setDescription] = useState(event?.description || "")
  const [eventDate, setEventDate] = useState<string>("")

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setEventDate(event.startTime?.split('T')[0] || "")
      setStartTime(event.startTime?.split('T')[1].slice(0, 5) || "09:00")
      setEndTime(event.endTime?.split('T')[1].slice(0, 5) || "17:00")
      setDescription(event.description || "")
    }
  }, [event])

  const handleSave = () => {
    onSave({
      title,
      startTime: `${eventDate}T${startTime}:00`,
      endTime: `${eventDate}T${endTime}:00`,
      description,
    })
    onClose()
  }

  const handleConvertToTask = () => {
    if (!startTime || !endTime || !title) return
    
    onConvertToTask?.({
      title,
      startTime: `${eventDate}T${startTime}:00`,
      endTime: `${eventDate}T${endTime}:00`,
      description,
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><div className="flex items-center justify-between">
      <DialogTitle>Edit Event</DialogTitle>
      {event && onConvertToTask && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleConvertToTask}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      )}
    </div>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {startTime && endTime && (
          <div className="grid gap-2">
            <Label>Event Time</Label>
            <div className="flex items-center space-x-2">
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Start Time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">to</span>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="End Time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add event description..."
              className="min-h-[100px]"
              />
            </div>
        </div>
        <div className="flex justify-end space-x-2">
          {event && onDelete && (
            <Button 
              variant="destructive" 
              onClick={() => {
                onDelete(event.id)
                onClose()
              }}
            >
              Delete
            </Button>
          )}
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

