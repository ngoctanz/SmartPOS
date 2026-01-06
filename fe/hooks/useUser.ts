import { useAuth } from "./useAuth";

export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === "admin";
}

export function useIsManager() {
  const { user } = useAuth();
  return user?.role === "manager";
}

export function useIsStaff() {
  const { user } = useAuth();
  return user?.role === "staff";
}

export function useHasRole(roles: Array<"admin" | "manager" | "staff">) {
  const { user } = useAuth();
  return user ? roles.includes(user.role) : false;
}

export function useCanManage() {
  const { user } = useAuth();
  return user?.role === "admin" || user?.role === "manager";
}
