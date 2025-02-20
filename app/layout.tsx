import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "next-themes"
import { SidebarProvider } from "@/lib/context/sidebar-context"
import { DateProvider } from "@/lib/context/date-context"
import { TasksProvider } from "@/lib/context/tasks-context"
import { BacklogProvider } from "@/lib/context/backlog-context"
import { TaskActionsProvider } from "@/lib/context/task-actions-context"
import { FilterProvider } from "@/lib/context/filter-context"
import { CurrentViewProvider } from "@/lib/context/current-view-context"
import { GoogleCalendarProvider } from "@/lib/context/google-calendar-context"
import { SelectedTasksProvider } from "@/lib/context/selected-tasks-context"
import { AiProvider } from "@/lib/context/ai-context"
import { PreviewTasksProvider } from "@/lib/context/preview-tasks-context"
import "./globals.css"
import { RootProvider } from "@/components/utilities/root-provider"
import { getServerUser } from "@/lib/firebaseAdmin"
import { RealtimeProvider } from "@/lib/context/transcription-context"
import { FunctionCallProvider } from "@/lib/context/function-call-context"
import { VoiceSessionProvider } from "@/lib/context/voice-session-context"
import { PlanProvider } from "@/lib/context/plan-context"
import { WorkflowProvider } from "@/lib/context/agent-workflow-context"
import { ActiveTaskProvider } from "@/lib/context/active-task-context"
import { DndContextProvider } from "@/components/providers/dnd-context-provider"
import { cn } from "@/lib/utils"
const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "ZipDay",
  description: "A productivity app for the modern age"
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <VoiceSessionProvider>
            <PlanProvider>
              
              <WorkflowProvider>
                  <RootProvider serverUser={user}>
                    <SidebarProvider>
                      <DateProvider>
                        <RealtimeProvider>
                          <TasksProvider>
                            <BacklogProvider>
                              <ActiveTaskProvider>
                                <FunctionCallProvider>
                                  <TaskActionsProvider>
                                    <FilterProvider>
                                      <CurrentViewProvider>
                                        <GoogleCalendarProvider>
                                          <SelectedTasksProvider>
                                            <PreviewTasksProvider>
                                              <AiProvider>
                                                <DndContextProvider>
                                                  <div className="flex min-h-screen flex-col">
                                                    <div className="flex flex-1">
                                                      <main className="flex-1 overflow-y-auto">
                                                        {children}
                                                      </main>
                                                    </div>
                                                  </div>
                                                </DndContextProvider>
                                              </AiProvider>
                                            </PreviewTasksProvider>
                                          </SelectedTasksProvider>
                                        </GoogleCalendarProvider>
                                      </CurrentViewProvider>
                                    </FilterProvider>
                                  </TaskActionsProvider>
                                </FunctionCallProvider>
                              </ActiveTaskProvider>
                            </BacklogProvider>
                          </TasksProvider>
                        </RealtimeProvider>
                      </DateProvider>
                    </SidebarProvider>
                  </RootProvider>
              </WorkflowProvider>
            </PlanProvider>
          </VoiceSessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
