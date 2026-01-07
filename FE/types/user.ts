import { BaseEntity } from "./common";

export type UserRole = "admin" | "staff";
export type UserStatus = "active" | "inactive";

export interface User extends BaseEntity {
  userName: string;
  name?: string;
  role: UserRole;
  branchId?: string;
  status: UserStatus;
}
