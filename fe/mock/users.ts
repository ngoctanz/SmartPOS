import { User } from "../types/user";

export const mockUsers: User[] = [
  {
    _id: "user_01",
    userName: "admin",
    name: "Nguyễn Quản Trị",
    role: "admin",
    status: "active",
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2023-01-01T00:00:00.000Z",
  },
  {
    _id: "user_02",
    userName: "staff_hn_01",
    name: "Trần Nhân Viên (HN)",
    role: "staff",
    branchId: "branch_01",
    status: "active",
    createdAt: "2023-01-05T00:00:00.000Z",
    updatedAt: "2023-01-05T00:00:00.000Z",
  },
  {
    _id: "user_03",
    userName: "staff_hn_02",
    name: "Lê Nhân Viên 2",
    role: "staff",
    branchId: "branch_01",
    status: "active",
    createdAt: "2023-01-10T00:00:00.000Z",
    updatedAt: "2023-01-10T00:00:00.000Z",
  },
  {
    _id: "user_04",
    userName: "staff_hcm_01",
    name: "Phạm Nhân Viên (HCM)",
    role: "staff",
    branchId: "branch_02",
    status: "active",
    createdAt: "2023-02-05T00:00:00.000Z",
    updatedAt: "2023-02-05T00:00:00.000Z",
  },
];
