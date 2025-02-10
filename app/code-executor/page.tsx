"use client"

import { CodeExecutor } from "@/components/ui/code-executor"

const initialCode = `// Example 1: Using checkWithUser for confirmation
const shouldProceed = await checkWithUser("Do you want to proceed with this action?");
console.log("User's choice:", shouldProceed);

if (shouldProceed) {
  // Example 2: Get and display backlog tasks
  const tasks = await getBacklogTasks();
  console.log("Backlog Tasks:", tasks);

  // Example 3: Get today's tasks
  const today = await getToday();
  console.log("Today's Tasks:", today);

  // Example 4: Create a new task with confirmation
  const confirmed = await checkWithUser("Do you want to create a new test task?");
  if (confirmed) {
    const newTask = {
      title: "Test Task",
      description: "This is a test task",
      date: "2024-02-07",
      start_time: "10:00",
      duration_minutes: 60,
      urgency: "medium",
      importance: "medium"
    };
    await createTask(newTask);
    console.log("Task created!");
  }
}

// Return all tasks to see the result
await getBacklogTasks();
`

export default function CodeExecutorPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Task Management Code Executor</h1>
        <p className="text-gray-600 mb-8">
          Execute JavaScript code to interact with your tasks. All functions are async and return Promises.
        </p>
        
        <CodeExecutor initialCode={initialCode} />
        
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Available Functions:</h2>
          <div className="space-y-6">
            {/* User Interaction */}
            <div>
              <h3 className="font-medium mb-2 text-lg">User Interaction</h3>
              <div className="space-y-4">
                <div>
                  <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">checkWithUser(message: string): Promise{`<boolean>`}</code>
                  <p className="text-sm text-gray-600 mt-1">Shows a confirmation dialog to the user and returns true if they click Continue, false if they click Cancel.</p>
                  <pre className="text-xs bg-slate-100 p-2 rounded mt-1">
{`// Example usage:
const confirmed = await checkWithUser("Are you sure?");
if (confirmed) {
  // User clicked Continue
  console.log("Proceeding with action");
} else {
  // User clicked Cancel
  console.log("Action cancelled");
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Rest of the documentation stays the same */}
            {/* ... existing documentation ... */}
          </div>

          <h2 className="text-xl font-semibold mb-4 mt-8">Tips:</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>All functions are asynchronous - use await with them</li>
            <li>Use console.log() to debug values</li>
            <li>The last evaluated expression will be returned and displayed</li>
            <li>Execution timeout is set to 5 seconds</li>
            <li>Functions return the actual data (not the ActionState wrapper)</li>
            <li>Use checkWithUser() to get user confirmation before critical actions</li>
          </ul>
        </div>
      </div>
    </div>
  )
}