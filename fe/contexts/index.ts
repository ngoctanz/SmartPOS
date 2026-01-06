// Auth Context
export { AuthProvider, useAuthContext } from "./auth-context";
export type { User } from "./auth-context";

// Auth hooks
export { useAuth, useLogin, useLogout } from "@/hooks/useAuth";
export {
  useUser,
  useIsAdmin,
  useIsManager,
  useIsStaff,
  useHasRole,
  useCanManage,
} from "@/hooks/useUser";
export { useRequireAuth, useRequireRole } from "@/hooks/useRequireAuth";
export { useRedirectIfAuthenticated } from "@/hooks/useRedirectIfAuthenticated";

// Auth components
export { ProtectedRoute } from "@/components/common/ProtectedRoute";
export { PublicRoute } from "@/components/common/PublicRoute";
export { RoleGuard } from "@/components/common/RoleGuard";
export { UserMenu } from "@/components/common/UserMenu";
