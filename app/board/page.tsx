"use server"

import { format } from "date-fns"
import { getTodayAction } from "@/actions/db/tasks-actions"
import { DashHeader } from "@/components/daily-planner/DashHeader"
import { TaskBoardWrapper } from "@/components/daily-planner/task-board-wrapper"
import { TaskBoardHeader } from "@/components/daily-planner/task-board-header"

export default async function BoardPage() {
  const { data: today } = await getTodayAction()
  if (!today) {
    return <div>Error loading tasks</div>
  }

  return (
    <div className="flex h-full flex-col">
      <TaskBoardHeader />
      <div className="flex-1 overflow-hidden">
        <TaskBoardWrapper initialTasks={today.tasks} today={today} />
      </div>
    </div>
  )
}
