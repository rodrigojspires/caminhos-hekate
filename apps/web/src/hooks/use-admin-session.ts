import { useSession } from "next-auth/react"
import { Role } from "@hekate/database"

export function useAdminSession() {
  const sessionResult = useSession()
  const { data: session, status } = sessionResult || { data: null, status: "loading" }
  
  const isAdmin = session?.user?.role === Role.ADMIN
  const isEditor = session?.user?.role === Role.EDITOR
  const hasAdminAccess = isAdmin || isEditor
  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"
  
  return {
    session,
    user: session?.user,
    isAdmin,
    isEditor,
    hasAdminAccess,
    isLoading,
    isAuthenticated,
    status
  }
}