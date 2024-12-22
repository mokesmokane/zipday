"use client"

import { useEffect } from "react"
import { SiteHeader } from "@/components/site/SiteHeader"

export default function SuccessPage() {
  useEffect(() => {
    setTimeout(() => {
      window.location.href = "/"
    }, 3000)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <SiteHeader />
      <div className="text-center text-white">
        <h1 className="mb-4 text-4xl font-bold">
          Thank you for your purchase!
        </h1>
        <p className="text-gray-400">You will be redirected shortly...</p>
      </div>
    </div>
  )
}
