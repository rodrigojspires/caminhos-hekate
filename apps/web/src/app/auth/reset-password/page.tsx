import { ResetPasswordForm } from "@/components/forms"

interface ResetPasswordPageProps {
  searchParams: { token?: string }
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token = searchParams.token || ''
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <ResetPasswordForm token={token} className="w-full max-w-md" />
    </div>
  )
}