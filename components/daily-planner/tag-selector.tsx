"use client"

import { useState, useRef, useEffect } from "react"
import { Command } from "cmdk"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useFilter } from "@/lib/context/filter-context"

interface TagSelectorProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
}

export function TagSelector({ tags, onTagsChange }: TagSelectorProps) {
  const { recentTags } = useFilter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setSearch("")
      inputRef.current?.focus()
    }
  }, [open])

  const handleSelect = (value: string) => {
    if (!tags.includes(value)) {
      onTagsChange([...tags, value])
    }
    setSearch("")
    setOpen(false)
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  const filteredTags = search
    ? recentTags.filter(tag => 
        tag.toLowerCase().includes(search.toLowerCase())
      )
    : recentTags

  return (
    <div className="flex flex-wrap gap-2 p-2">
      {tags.map(tag => (
        <Badge 
          key={tag} 
          variant="secondary" 
          className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground px-3 py-1"
          onClick={() => handleRemoveTag(tag)}
        >
          #{tag}
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Badge 
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-accent px-3 py-1"
          >
            <Plus className="h-3 w-3 mr-2" />
            Add tag
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2" align="start">
          <Command className="border-none rounded-lg">
            <Command.Input 
              ref={inputRef}
              placeholder="Search tags..." 
              value={search}
              onValueChange={setSearch}
              className="h-7 text-s border-none focus:ring-0 focus-visible:ring-0 focus:outline-none outline-none px-2 w-[120px]" /* Added fixed width */
            />
            <Command.List className="py-2">
              {search && (
                <Command.Item 
                  value={`create-${search}`}
                  onSelect={() => handleSelect(search)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                >
                  Create #{search}
                </Command.Item>
              )}
              {filteredTags.map(tag => (
                <Command.Item 
                  key={tag}
                  value={tag}
                  onSelect={() => handleSelect(tag)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                >
                  #{tag}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
} 