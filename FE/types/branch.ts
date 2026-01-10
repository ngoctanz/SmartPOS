import { BaseEntity } from "./common";

export interface Branch extends BaseEntity {
  branchName: string;
  address: string;
  contactInfo: string;
  isDeleted: boolean;
  // PayOS credentials for online payment
  PAYOS_CLIENT_ID?: string;
  PAYOS_API_KEY?: string;
  PAYOS_CHECKSUM_KEY?: string;
}
