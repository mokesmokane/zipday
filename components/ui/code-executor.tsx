import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

interface CodeExecutorProps {
  initialCode?: string
}

export function CodeExecutor({ initialCode = "" }: CodeExecutorProps) {
  const [code, setCode] = useState(initialCode)
  const [result, setResult] = useState<string>("")
  const [outputs, setOutputs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState("")
  const dialogResolveRef = useRef<((value: boolean) => void) | null>(null)

  const checkWithUser = async (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      dialogResolveRef.current = resolve
      setDialogMessage(message)
      setDialogOpen(true)
    })
  }

  const handleDialogConfirm = () => {
    setDialogOpen(false)
    dialogResolveRef.current?.(true)
    dialogResolveRef.current = null
  }

  const handleDialogCancel = () => {
    setDialogOpen(false)
    dialogResolveRef.current?.(false)
    dialogResolveRef.current = null
  }

  const executeCode = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch("/api/execute-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          code,
          context: {
            checkWithUser: async (message: string) => {
              return await checkWithUser(message)
            }
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
        setResult("")
        setOutputs([])
      } else {
        setResult(data.result)
        setOutputs(data.outputs || [])
      }
    } catch (error: any) {
      setError(`Error: ${error.message}`)
      setResult("")
      setOutputs([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 w-full max-w-2xl">
      <Card className="p-4">
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter your code here..."
          className="font-mono min-h-[200px] mb-4"
        />
        <Button 
          onClick={executeCode}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Executing..." : "Execute Code"}
        </Button>
      </Card>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <h3 className="font-semibold mb-2 text-red-700">Error:</h3>
          <pre className="text-red-600 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
            {error}
          </pre>
        </Card>
      )}

      {(outputs.length > 0 || result) && !error && (
        <Card className="p-4">
          {outputs.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Console Output:</h3>
              <pre className="bg-slate-100 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                {outputs.join("\n")}
              </pre>
            </div>
          )}
          
          {result && (
            <div>
              <h3 className="font-semibold mb-2">Return Value:</h3>
              <pre className="bg-slate-100 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                {result}
              </pre>
            </div>
          )}
        </Card>
      )}

      <ConfirmationDialog
        open={dialogOpen}
        message={dialogMessage}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </div>
  )
}