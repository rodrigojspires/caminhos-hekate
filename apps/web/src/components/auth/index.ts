// HOCs and Components
export { ProtectedRoute, withProtectedRoute } from "./ProtectedRoute"
export { withAuth, hasRole, isAdmin, isEditor } from "./withAuth"
export {
  AuthGuard,
  AuthenticatedOnly,
  UnauthenticatedOnly,
  AdminOnly,
  EditorOnly,
  VerifiedOnly
} from "./AuthGuard"

// Types
export type { WithAuthOptions } from "./withAuth"