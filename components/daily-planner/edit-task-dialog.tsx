"use client"

import { useState, useEffect } from "react"
import { Plus, GripVertical, Trash2, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { motion, AnimatePresence } from "framer-motion"
import type { Task, Subtask, Day } from "@/types/daily-task-types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TagSelector } from "./tag-selector"

interface EditTaskDialogProps {
  day: Day
  task: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Task) => void
  isNewTask?: boolean
  onDelete?: (taskId: string) => void
}

const TIME_OPTIONS = [
  { label: '5 mins', value: '5m' },
  { label: '10 mins', value: '10m' },
  { label: '15 mins', value: '15m' },
  { label: '30 mins', value: '30m' },
  { label: '45 mins', value: '45m' },
  { label: '1 hour', value: '1h' },
  { label: '2 hours', value: '2h' },
  { label: '4 hours', value: '4h' },
  { label: '6 hours', value: '6h' },
  { label: '8 hours', value: '8h' },
]

export function EditTaskDialog({ day,task, open, onOpenChange, onSave, isNewTask, onDelete }: EditTaskDialogProps) {
  const [editedTask, setEditedTask] = useState<Task>({ ...task })

  useEffect(() => {
    setEditedTask({ ...task })
  }, [task])

  const handleAddSubtask = () => {
    const subtask: Subtask = {
      id: `subtask-${Date.now()}`,
      text: "",
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setEditedTask(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, subtask]
    }))
  }

  const handleRemoveSubtask = (subtaskId: string) => {
    setEditedTask(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter(st => st.id !== subtaskId)
    }))
  }

  const handleSave = () => {
    onSave(editedTask)
    onOpenChange(false)
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const newSubtasks = Array.from(editedTask.subtasks)
    const [reorderedItem] = newSubtasks.splice(result.source.index, 1)
    newSubtasks.splice(result.destination.index, 0, reorderedItem)

    setEditedTask(prev => ({ ...prev, subtasks: newSubtasks }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] [&>button]:hidden">
        <DialogHeader className="space-y-2">
          <span className="sr-only">
            <DialogTitle>Edit Task</DialogTitle>
          </span>
          <div className="flex items-center justify-between">
            <TagSelector 
              tags={editedTask.tags || []}
              recentTags={[
                // You'll need to pass recently used tags from your data store
                "work", "personal", "urgent", "meeting", "followup"
              ]}
              onTagsChange={(newTags) => 
                setEditedTask(prev => ({ ...prev, tags: newTags }))
              }
            />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{day.date}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="flex gap-4 items-center">
            <Input
              id="title"
              value={editedTask.title}
              onChange={(e) => setEditedTask(prev => ({ ...prev, title: e.target.value }))}
              className="text-lg flex-1"
            />
            <div className="relative flex items-center w-32">
              <Input
                id="time"
                value={editedTask.time || ""}
                onChange={(e) => setEditedTask(prev => ({ ...prev, time: e.target.value }))}
                placeholder="Duration"
                className="text-sm pr-8"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 h-full w-8 hover:bg-transparent"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {TIME_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setEditedTask(prev => ({ ...prev, time: option.label }))}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid gap-2">
            <Textarea
              id="description"
              value={editedTask.description || ""}
              onChange={(e) => setEditedTask(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add task description..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="subtasks" isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={true}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {editedTask.subtasks.map((subtask, index) => (
                        <Draggable key={subtask.id} draggableId={subtask.id} index={index}>
                          {(provided) => (
                            <motion.div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center gap-2"
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="checkbox"
                                checked={subtask.completed}
                                onChange={(e) => {
                                  setEditedTask(prev => ({
                                    ...prev,
                                    subtasks: prev.subtasks.map(st =>
                                      st.id === subtask.id ? { ...st, completed: e.target.checked } : st
                                    )
                                  }))
                                }}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Input
                                value={subtask.text}
                                onChange={(e) => {
                                  setEditedTask(prev => ({
                                    ...prev,
                                    subtasks: prev.subtasks.map(st =>
                                      st.id === subtask.id ? { ...st, text: e.target.value } : st
                                    )
                                  }))
                                }}
                                placeholder="Enter subtask..."
                                className={subtask.completed ? "line-through text-gray-500" : ""}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveSubtask(subtask.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          )}
                        </Draggable>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}
                    
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="w-5" />
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground h-10 px-0"
                        onClick={handleAddSubtask}
                      >
                        <Plus className="h-4 w-4" />
                        Add subtask
                      </Button>
                    </motion.div>
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          {!isNewTask && (
            <Button 
              variant="destructive" 
              onClick={() => {
                // TODO: Add confirmation dialog before deletion
                onDelete?.(task.id)
                onOpenChange(false)
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Task
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isNewTask ? 'Add Task' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

