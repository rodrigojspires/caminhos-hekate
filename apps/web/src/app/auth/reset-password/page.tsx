"use client"

import { useSearchParams } from "next/navigation"
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4 dark:from-gray-950 dark:to-gray-900">
      <ResetPasswordForm token={token} className="w-full max-w-md" />
    </div>
  )
}

