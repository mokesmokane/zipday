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
import "./globals.css"
import { RootProvider } from "@/components/utilities/root-provider"
import { getServerUser } from "@/lib/firebaseAdmin"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "McKay's App Template",
  description: "A template for building apps with Next.js and Firebase"
}


export default async function RootLayout({
  children
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
          <RootProvider serverUser={user}>
            <SidebarProvider>
              <DateProvider>
                <TasksProvider>
                  <BacklogProvider>
                  <TaskActionsProvider>
                    <FilterProvider>
                      <CurrentViewProvider>
                        <GoogleCalendarProvider>
                          {children}
                        </GoogleCalendarProvider>
                      </CurrentViewProvider>
                    </FilterProvider>
                    </TaskActionsProvider>
                  </BacklogProvider>
                  </TasksProvider>
              </DateProvider>
            </SidebarProvider>
          </RootProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
