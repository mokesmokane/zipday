'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Task } from '@/types/daily-task-types'
import { parseTaskInput } from '@/lib/utils/task-parser'
import { determineNextEntryStage, getCurrentEntryStage, processEnterKey } from '@/lib/utils/entry-stage-manager'
import { getSuggestions, SuggestionManager } from "@/lib/utils/suggestion-manager"
import { useGoogleCalendar } from "@/lib/context/google-calendar-context"
import { useDate } from "@/lib/context/date-context"
interface AIInputProps {
    onSubmit: (value: string) => void
    onValueChanged: (previewTasks: Task[]) => void
    onCancel?: () => void
    placeholder?: string
    initialValue?: string
    isEditing?: boolean
    currentDate?: string
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
    const [previewTasks, setPrevTasks] = useState<Task[]>([])
    const [currentTask, setCurrentTask] = useState<Task | null>(null)
    const [contextTasks, setContextTasks] = useState<Task[]>([])
    const [current_text, setCurrent_text] = useState<string>('')
    const {selectedDate} = useDate()
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
    const [scrollTop, setScrollTop] = useState(0)
    const {events} = useGoogleCalendar()

    const setPreviewTasks = (tasks: Task[]) => {
      setPrevTasks(tasks)
      onValueChanged(tasks)
    }
    // Add this new function to format the suggestion preview
    const getFormattedSuggestion = () => {
      if (!currentSuggestion) return ''
      
      const currentLine = current_text.trim()
      let suggestion = currentSuggestion

      // Handle different prefixes based on entry stage
      if (entryStage === 'category') {
        suggestion = suggestion.replace(/^#/, '')
        if (currentLine.startsWith('#')) {
          const textAfterHash = currentLine.slice(1)
          if (suggestion.startsWith(textAfterHash)) {
            return suggestion.slice(textAfterHash.length)
          }
        }
      } else if (entryStage === 'time') {
        suggestion = suggestion.replace(/^@/, '')
        if (currentLine.startsWith('@')) {
          const textAfterAt = currentLine.slice(1)
          if (suggestion.startsWith(textAfterAt)) {
            return suggestion.slice(textAfterAt.length)
          }
        }
      }
      
      // For other cases, only show what would be appended
      if (suggestion.startsWith(currentLine)) {
        return suggestion.slice(currentLine.length)
      }
      
      return suggestion
    }

    // Add predefined options for duration and categories
    const durationOptions = ['30m', '1h', '1h30m', '2h', '3h', '4h']
    const categoryOptions = ['work', 'personal', 'health', 'errands', 'meeting'] // These are example categories, you might want to fetch these from somewhere

    const aiSuggestionManager: SuggestionManager = {
      getAISuggestions: async ({ currentTask, contextTasks, completionType, currentText }) => {
        const response = await fetch('/api/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ current_task: currentTask, context_tasks: contextTasks, completion_type: completionType, current_text: currentText })
        })
        if (!response.ok) throw new Error('Failed to get suggestions')
        const data = await response.json()
        return data.completions
      }
    }

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
        console.log('getSuggestionsByStage', current_text, entryStage)

        const suggestions = await getSuggestions(
          inputValue,
          current_text,
          entryStage,
          aiSuggestionManager,
          {
            categoryOptions,
            durationOptions,
            timeOptions: ['9:00', '10:00', '11:00', '14:00', '15:00'],
            events: events
          },
          selectedDate
        )
        console.log('suggestions', suggestions)
        setSuggestions(suggestions)
      } catch (error) {
        console.error('Error getting suggestions:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }
  
    const handleSuggestionAction = async () => {
        //consolle ogs to see why this is not working
        console.log('handleSuggestionAction', showTabPrompt, inputValue.trim().length, isLoading, suggestions.length)
        console.log('current_text', current_text)
        console.log('entryStage', entryStage)
        console.log('suggestions', suggestions)
        console.log('currentSuggestionIndex', currentSuggestionIndex)
        console.log('currentSuggestion', currentSuggestion)
        console.log('inputValue', inputValue)
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
        if ((showTabPrompt || inputValue.trim().length === 0) && !isLoading && suggestions.length === 0) {
          setShowTabPrompt(false)
          await getSuggestionsByStage()
        } else if (suggestions.length > 0) {
          setCurrentSuggestionIndex((prev) => (prev + 1) % suggestions.length)
          const parsedTasks = parseTaskInput(inputValue + getFormattedSuggestion())
          setPreviewTasks(parsedTasks)
        }
      } else if (e.key === 'Enter') {
        setShowTabPrompt(true)
        if (e.shiftKey || suggestions.length > 0) {
            e.preventDefault()
            let value = inputValue
            if (suggestions.length > 0) {
                // Get the current line without any prefixes
                const currentLine = current_text.trim()
                let suggestionToAppend = currentSuggestion
    
                // Handle different prefixes based on entry stage
                if (entryStage === 'category' && currentLine.startsWith('#')) {
                // For category, remove the # from suggestion if current line has #
                    suggestionToAppend = getFormattedSuggestion()
                } else if (entryStage === 'time' && currentLine.startsWith('@')) {
                // For time, remove the @ from suggestion if current line has @
                    suggestionToAppend = getFormattedSuggestion()
                }
    
                // Replace the current line with the suggestion
                const lines = inputValue.split('\n')
                lines[lines.length - 1] = lines[lines.length - 1] + suggestionToAppend
                const newValue = lines.join('\n')
    
                value = newValue
                setCurrentSuggestionIndex(0)
            } 

            setSuggestions([])
            const newValue = processEnterKey(value + '\n')
            setInputValue(newValue)
            setCurrent_text(newValue.split('\n').pop() || '')
            const stage = getCurrentEntryStage(newValue)
            setEntryStage(stage)
            const parsedTasks = parseTaskInput(newValue)
            setPreviewTasks(parsedTasks)
            
            // Ensure cursor is visible after adding new line
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                const textarea = textareaRef.current
                textarea.scrollTop = textarea.scrollHeight
                }
            })
          }
          else {
            handleSubmit()
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
                <span className="text-muted-foreground">{getFormattedSuggestion()}</span>
              </div>
            </div>
            <Textarea
              ref={textareaRef}
              className={cn(
                "w-full resize-none transition-all duration-300 ease-in-out bg-transparent",
                (showTabPrompt || showButton || suggestions.length > 0) ? "pb-16" : "pb-4"
              )}
              rows={6}
              placeholder={currentSuggestion ? "" : placeholder}
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