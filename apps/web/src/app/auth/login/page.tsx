import { LoginForm } from "@/components/forms"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <LoginForm className="w-full max-w-md" />
    </div>
  )
}