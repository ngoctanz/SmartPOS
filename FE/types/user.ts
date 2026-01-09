import { BaseEntity } from "./common";

export type UserRole = "admin" | "manager" | "staff";
export type UserStatus = "active" | "inactive";

export interface User extends BaseEntity {
  userName: string;
  name?: string;
  role: UserRole;
  branchId?: string;
  status: UserStatus;
}
