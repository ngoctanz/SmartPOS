import { Branch } from "../types/branch";

export const mockBranches: Branch[] = [
  {
    _id: "branch_01",
    branchName: "Chi nhánh Hà Nội",
    address: "123 Cầu Giấy, Hà Nội",
    contactInfo: "0901234567",
    isDeleted: false,
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2023-01-01T00:00:00.000Z",
  },
  {
    _id: "branch_02",
    branchName: "Chi nhánh TP.HCM",
    address: "456 Nguyễn Trãi, Quận 1, TP.HCM",
    contactInfo: "0909876543",
    isDeleted: false,
    createdAt: "2023-02-01T00:00:00.000Z",
    updatedAt: "2023-02-01T00:00:00.000Z",
  },
];
