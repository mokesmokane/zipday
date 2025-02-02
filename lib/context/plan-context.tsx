"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface PlanContextType {
  todo_list: string[]
  setTodoList: (todo_list: string[]) => void
  clearTodoList: () => void
}

const PlanContext = createContext<PlanContextType | undefined>(undefined)

export function PlanProvider({ children }: { children: ReactNode }) {
  const [todo_list, setTodoList] = useState<string[]>([])

  const clearTodoList = () => {
    setTodoList([])
  }

  return (
    <PlanContext.Provider
      value={{
        todo_list,
        setTodoList,
        clearTodoList
      }}
    >
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  const context = useContext(PlanContext)
  if (context === undefined) {
    throw new Error("usePlan must be used within a PlanProvider")
  }
  return context
}
