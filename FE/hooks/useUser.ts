import { useAuth } from "./useAuth";

export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === "admin";
}

export function useIsStaff() {
  const { user } = useAuth();
  return user?.role === "staff";
}

export function useHasRole(roles: Array<"admin" | "staff">) {
  const { user } = useAuth();
  return user ? roles.includes(user.role) : false;
}

export function useCanManage() {
  const { user } = useAuth();
  return user?.role === "admin";
}
