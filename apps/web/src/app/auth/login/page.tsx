import { LoginForm } from "@/components/forms"

interface LoginPageProps {
  searchParams?: {
    next?: string
  }
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const rawNext = searchParams?.next
  const safeRedirect =
    typeof rawNext === 'string' &&
    rawNext.length > 0 &&
    rawNext.startsWith('/') &&
    !rawNext.startsWith('//')
      ? rawNext
      : '/dashboard'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <LoginForm className="w-full max-w-md" redirectTo={safeRedirect} />
    </div>
  )
}
