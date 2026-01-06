import { BaseEntity } from "./common";

export interface Branch extends BaseEntity {
  branchName: string;
  address: string;
  contactInfo: string;
  isDeleted: boolean;
}
