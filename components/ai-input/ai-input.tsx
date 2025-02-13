'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Task } from '@/types/daily-task-types'
import { parseTaskInput } from '@/lib/utils/task-parser'
import { determineNextEntryStage, getCurrentEntryStage, processEnterKey } from '@/lib/utils/entry-stage-manager'

interface AIInputProps {
    onSubmit: (value: string) => void
    onValueChanged: (previewTasks: Task[]) => void
    onCancel?: () => void
    placeholder?: string
    initialValue?: string
    isEditing?: boolean
  }
  
  export function AIInput({ 
    placeholder = 'Type something...',
    onSubmit, 
    onCancel, 
    onValueChanged,
    initialValue = '', 
    isEditing = false
  }: AIInputProps) {
    const [inputValue, setInputValue] = useState(initialValue)
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0)
    const [showTabPrompt, setShowTabPrompt] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [showButton, setShowButton] = useState(false)
    const [previewTasks, setPreviewTasks] = useState<Task[]>([])
    const [currentTask, setCurrentTask] = useState<Task | null>(null)
    const [contextTasks, setContextTasks] = useState<Task[]>([])
    const [current_text, setCurrent_text] = useState<string>('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    // const { canvasTheme, formData } = useCanvas()
    const promptTimeoutRef = useRef<NodeJS.Timeout>()
    const currentSuggestion = suggestions[currentSuggestionIndex] || ''
    // const isMobile = useIsMobile()
    const isMobile = false
    // const { user } = useAuth();
    // var { hasAccessToProFeatures } = useSubscription()
    const [flashUpgrade, setFlashUpgrade] = useState(false)
    const [entryStage, setEntryStage] = useState<'title' | 'subtask' | 'category' | 'time' | 'duration' | 'description'>('title')
    const [previousLineCount, setPreviousLineCount] = useState(1)
    const [scrollTop, setScrollTop] = useState(0)

    // Add predefined options for duration and categories
    const durationOptions = ['30m', '1h', '1h30m', '2h', '3h', '4h']
    const categoryOptions = ['work', 'personal', 'health', 'errands', 'meeting'] // These are example categories, you might want to fetch these from somewhere

    const handleSubmit = () => {
      if (inputValue.trim()) {
        onSubmit(inputValue.trim())
        setInputValue('')
      }
    }
  
    const handleCancel = () => {
      setInputValue('')
      onCancel?.()
    }

    // Function to get suggestions based on entry stage
    const getSuggestionsByStage = async () => {
      setIsLoading(true)
      try {
        switch (entryStage) {
          case 'title':
          case 'subtask':
            // Call AI API for title and subtask suggestions
            const response = await fetch('/api/complete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ current_task: currentTask, context_tasks: contextTasks, completion_type: entryStage, current_text: current_text })
            })
            if (!response.ok) throw new Error('Failed to get suggestions')
            const data = await response.json()
            setSuggestions(data.completions)
            break

          case 'category':
            // Use predefined categories
            setSuggestions(categoryOptions.map(cat => `${cat}`))
            break

          case 'duration':
            // Use predefined duration options
            setSuggestions(durationOptions)
            break

          case 'time':
            // Placeholder for time suggestions
            setSuggestions(['9:00', '10:00', '11:00', '14:00', '15:00']) // These will be replaced by actual available times later
            break

          default:
            setSuggestions([])
        }
      } catch (error) {
        console.error('Error getting suggestions:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }
  
    const handleSuggestionAction = async () => {
      if ((showTabPrompt || inputValue.trim().length === 0) && !isLoading && suggestions.length === 0) {
        setShowTabPrompt(false)
        await getSuggestionsByStage()
      } else if (suggestions.length > 0) {
        setCurrentSuggestionIndex((prev) => (prev + 1) % suggestions.length)
      }
    }
  
    const handleInputChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      setSuggestions([])
      setCurrentSuggestionIndex(0)
  
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current)
      }
  
      if (e.target.selectionStart === newValue.length && newValue.trim().length > 0) {
        promptTimeoutRef.current = setTimeout(() => {
          setShowTabPrompt(true)
        }, 500)
      } else {
        setShowTabPrompt(false)
      }

      // Ensure cursor is visible by scrolling into view
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const textarea = textareaRef.current
          textarea.scrollTop = textarea.scrollHeight
        }
      })
      
      const parsedTasks = parseTaskInput(newValue)
      setPreviewTasks(parsedTasks)
      onValueChanged(parsedTasks)
      setCurrent_text(newValue.split('\n').pop() || '')
      setCurrentTask(parsedTasks.length > 0 ? parsedTasks[parsedTasks.length - 1] : null)
      setContextTasks(parsedTasks.length > 1 ? parsedTasks.slice(0, -1) : [])
      const stage = getCurrentEntryStage(newValue)
      setEntryStage(stage)
    }
  
    const handleKeyDown = async (e: React.KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        // if (!hasAccessToProFeatures) {
        //   e.preventDefault()
        //   setFlashUpgrade(true)
        //   setTimeout(() => setFlashUpgrade(false), 1000)
        //   return
        // }
        e.preventDefault()
        console.log("inputValue", inputValue)
        console.log("showTabPrompt", showTabPrompt)
        console.log("isLoading", isLoading)
        console.log("suggestions", suggestions)
        if ((showTabPrompt || inputValue.trim().length === 0) && !isLoading && suggestions.length === 0) {
          setShowTabPrompt(false)
          await getSuggestionsByStage()
        } else if (suggestions.length > 0) {
          setCurrentSuggestionIndex((prev) => (prev + 1) % suggestions.length)
        }
      } else if (e.key === 'Enter') {
        setShowTabPrompt(true)
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          if (suggestions.length > 0) {
            setInputValue(prev => prev + currentSuggestion)
            setSuggestions([])
            setCurrentSuggestionIndex(0)
          } else {
            handleSubmit()
          }
        } else if (e.shiftKey) {
          e.preventDefault()
          setSuggestions([])
          const newValue = processEnterKey(inputValue + '\n')
          setInputValue(newValue)
          setPreviousLineCount(newValue.split('\n').length)
          const stage = getCurrentEntryStage(newValue)
          setEntryStage(stage)
          
          // Ensure cursor is visible after adding new line
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              const textarea = textareaRef.current
              textarea.scrollTop = textarea.scrollHeight
            }
          })
        }
      } else if (e.key === 'Escape' && onCancel) {
        e.preventDefault()
        handleCancel()
      }
    }
    useEffect(() => {
      if (isEditing && initialValue) {
        setInputValue(initialValue);
      } else {
        setInputValue('');
      }
    }, [isEditing, initialValue]);
  
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }
  
    return (
      <div 
        className="w-full"
      >
        <div className={`relative transition-all duration-300 ease-in-out`}>
          <div className="relative">
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ transform: `translateY(-${scrollTop}px)` }}
            >
              <div className="pt-[9px] pl-[13px] whitespace-pre-wrap break-words text-base md:text-sm">
                <span className="opacity-0">{inputValue}</span>
                <span className="text-muted-foreground">{currentSuggestion}</span>
              </div>
            </div>
            <Textarea
              ref={textareaRef}
              className={cn(
                "w-full resize-none transition-all duration-300 ease-in-out bg-transparent",
                (showTabPrompt || showButton || suggestions.length > 0) ? "pb-16" : "pb-4"
              )}
              rows={6}
              placeholder={placeholder}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsFocused(true)
                setShowButton(true)
              }}
              onBlur={() => {
                setIsFocused(false)
                if (!inputValue) {
                  setShowButton(false)
                }
              }}
              onScroll={handleScroll}
            />
          </div>
          <div className="absolute left-2 bottom-2 flex items-center gap-2">
            {(showTabPrompt || (isFocused && !showTabPrompt && suggestions.length === 0 && !isLoading)) && (
              <div 
                className={cn(
                  "bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-all duration-300",
                //   !hasAccessToProFeatures && flashUpgrade && "bg-primary text-primary-foreground animate-pulse"
                )}
                onClick={handleSuggestionAction}
              >
                <kbd className="bg-background px-1 rounded">{isMobile ? 'Tap' : 'Tab'}</kbd>
                <span>{ 
                    entryStage === 'title' ? 'ai suggest' 
                    : entryStage === 'subtask' ? 'ai suggest' 
                    : entryStage === 'category' ? 'tags' 
                    : entryStage === 'duration' ? 'duration' 
                    : entryStage === 'time' ? 'schedule' 
                    : 'suggest' }</span>
              </div>
            )}
            {suggestions.length > 0 && (
              <div 
                className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer"
                onClick={handleSuggestionAction}
              >
                <kbd className="bg-background px-1 rounded">{isMobile ? 'Tap' : 'Tab'}</kbd>
                <span>{currentSuggestionIndex + 1}/{suggestions.length}</span>
                <kbd className="bg-background px-1 rounded">↵</kbd>
                <span>accept</span>
              </div>
            )}
            {isLoading && (
              <div className="text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"/>
              </div>
            )}
          </div>
            <div 
              className={`absolute right-2 bottom-2 flex items-center gap-2 transition-opacity duration-300 ease-in-out ${
                showButton ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {onCancel && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  aria-label="Cancel"
                  className="py-1 h-7"
                >
                  Cancel
                </Button>
              )}
              <Button 
                size="sm"
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                aria-label={isEditing ? "Save changes" : "Add item"}
                className="py-1 h-7"
              >
                <Send className="h-4 w-4 mr-2" />
                {isEditing ? 'Save' : 'Send'}
              </Button>
            </div>
        </div>
      </div>
    )
  }