import { NextRequest, NextResponse } from "next/server"
import { executeCodeAction } from "@/actions/db/execute-code-actions"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    const result = await executeCodeAction(code)
    
    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: `Server Error: ${error.message}` },
      { status: 500 }
    )
  }
} 