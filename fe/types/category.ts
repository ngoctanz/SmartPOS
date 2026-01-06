import { BaseEntity } from "./common";

export interface Category extends BaseEntity {
  name: string;
  desc?: string;
  isDeleted: boolean;
}
