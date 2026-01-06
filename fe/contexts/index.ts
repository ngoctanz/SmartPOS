// Auth Context
export { AuthProvider, useAuth } from "./AuthContext";

// Auth hooks
export { default as useAuthHook } from "@/hooks/useAuth";
export {
  useUser,
  useIsAdmin,
  useIsManager,
  useIsStaff,
  useHasRole,
  useCanManage,
} from "@/hooks/useUser";
export { useRequireAuth, useRequireRole } from "@/hooks/useRequireAuth";

// Auth components
export { ProtectedRoute } from "@/components/common/ProtectedRoute";
export { PublicRoute } from "@/components/common/PublicRoute";
export { RoleGuard } from "@/components/common/RoleGuard";
export { UserMenu } from "@/components/common/UserMenu";
