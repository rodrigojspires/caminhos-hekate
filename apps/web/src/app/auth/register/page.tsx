import { RegisterForm } from "@/components/forms"

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <RegisterForm className="w-full max-w-md" />
    </div>
  )
}