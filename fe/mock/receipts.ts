import { Receipt, ImportReceipt } from "../types/receipt";

export const mockReceipts: Receipt[] = [
  {
    _id: "receipt_01",
    code: "HD001",
    branchId: "branch_01",
    createdBy: "user_03",
    listProduct: [
      {
        productId: "prod_01",
        productName: "Cà phê đen đá",
        quantity: 2,
        salePrice: 25000,
      },
      {
        productId: "prod_02",
        productName: "Cà phê sữa đá",
        quantity: 1,
        salePrice: 30000,
      },
    ],
    totalAmount: 80000,
    paymentMethod: "cash",
    status: "completed",
    createdAt: "2023-06-15T08:30:00.000Z",
    updatedAt: "2023-06-15T08:30:00.000Z",
  },
  {
    _id: "receipt_02",
    code: "HD002",
    branchId: "branch_01",
    createdBy: "user_03",
    listProduct: [
      {
        productId: "prod_04",
        productName: "Bánh Tiramisu",
        quantity: 2,
        salePrice: 45000,
      },
    ],
    totalAmount: 90000,
    paymentMethod: "transfer",
    status: "completed",
    createdAt: "2023-06-15T09:15:00.000Z",
    updatedAt: "2023-06-15T09:15:00.000Z",
  },
];

export const mockImportReceipts: ImportReceipt[] = [
  {
    _id: "import_01",
    code: "PN001",
    barcode: "2000010001234",
    branchId: "branch_01",
    supplierName: "Công ty Cà phê Trung Nguyên",
    createdBy: "user_02",
    listProduct: [
      {
        productId: "prod_01",
        barcode: "8930001",
        productName: "Cà phê đen đá",
        quantity: 100,
        importPrice: 10000,
        subtotal: 1000000,
      },
      {
        productId: "prod_02",
        barcode: "8930002",
        productName: "Cà phê sữa đá",
        quantity: 50,
        importPrice: 12000,
        subtotal: 600000,
      },
    ],
    totalAmount: 1600000,
    status: "completed",
    note: "Nhập hàng đầu tháng",
    createdAt: "2023-06-01T08:00:00.000Z",
    updatedAt: "2023-06-01T08:00:00.000Z",
  },
];
