import { BaseEntity } from "./common";

export interface Product extends BaseEntity {
  categoryId: string; // ObjectId
  name: string;
  desc?: string;
  barcode: string;
  unit: string;
  image?: string;
  currentSalePrice: number;
  isDeleted: boolean;
}

export interface BranchProduct extends BaseEntity {
  branchId: string; // ObjectId
  productId: string; // ObjectId
  stock: number;
  minStock: number;
}
