# 📊 DATABASE SCHEMA & BUSINESS LOGIC

## 🎯 Tổng quan hệ thống

Hệ thống quản lý bán hàng đa chi nhánh (POS) với các chức năng:
- Quản lý sản phẩm theo danh mục
- Nhập hàng từ nhà cung cấp
- Bán hàng tại quầy (POS)
- Quản lý tồn kho theo chi nhánh
- Báo cáo doanh thu & lợi nhuận

---

## 🔑 NGUYÊN TẮC VÀNG

1. **Product KHÔNG lưu giá nhập** - Chỉ có `currentSalePrice`
2. **Giá nhập chỉ nằm ở phiếu nhập** - `ImportReceipt`
3. **Hóa đơn lưu luôn giá vốn tại thời điểm bán** - `costPrice` trong `Receipt`
4. **Dùng GIÁ VỐN TRUNG BÌNH (Weighted Average Cost)** - Đơn giản + đủ chính xác

---

## 📦 CẤU TRÚC DATABASE (MongoDB)

### 1. Category (Danh mục sản phẩm)
```javascript
{
  "_id": ObjectId,
  "name": String,              // Tên danh mục: "Đồ uống", "Thực phẩm"...
  "desc": String,              // Mô tả
  "isDeleted": Boolean,
  "createdAt": Date,
  "updatedAt": Date
}
```

---

### 2. Product (Sản phẩm)
```javascript
{
  "_id": ObjectId,
  "categoryId": ObjectId,           // Thuộc danh mục nào
  "name": String,                   // Tên sản phẩm
  "desc": String,                   // Mô tả
  "barcode": String,                // Mã vạch (để quét POS)
  "unit": String,                   // Đơn vị: "lon", "chai", "hộp"...
  "image": String,                  // URL hình ảnh
  "currentSalePrice": Number,       // 💰 Giá bán hiện tại
  // ❌ KHÔNG CÓ currentImportPrice
  "isDeleted": Boolean,
  "createdAt": Date,
  "updatedAt": Date
}
```

**Lưu ý:** Product KHÔNG lưu giá nhập. Giá nhập được tính từ `BranchProduct.avgImportPrice`

---

### 3. Branch (Chi nhánh)
```javascript
{
  "_id": ObjectId,
  "branchName": String,       // Tên chi nhánh
  "address": String,          // Địa chỉ
  "contactInfo": String,      // SĐT, email
  "isDeleted": Boolean,
  "createdAt": Date,
  "updatedAt": Date
}
```

---

### 4. BranchProduct (Tồn kho theo chi nhánh) ⭐ QUAN TRỌNG
```javascript
{
  "_id": ObjectId,
  "branchId": ObjectId,        // Chi nhánh nào
  "productId": ObjectId,       // Sản phẩm nào
  "stock": Number,             // 📦 Số lượng tồn kho
  "avgImportPrice": Number,    // 💰 GIÁ VỐN TRUNG BÌNH
  "minStock": Number,          // Mức cảnh báo hết hàng
  "updatedAt": Date
}
```

**Đây là điểm mấu chốt!** `avgImportPrice` được tính lại mỗi khi nhập hàng.

---

### 5. User (Người dùng)
```javascript
{
  "_id": ObjectId,
  "userName": String,
  "email": String,
  "phone": String,
  "name": String,
  "password": String,          // Đã hash
  "role": String,              // "admin", "manager", "staff"
  "branchId": ObjectId,        // Thuộc chi nhánh nào
  "status": String,            // "active", "inactive"
  "createdAt": Date,
  "updatedAt": Date
}
```

---

### 6. ImportReceipt (Phiếu nhập hàng)
```javascript
{
  "_id": ObjectId,
  "code": String,              // Mã phiếu: "PN001", "PN002"...
  "branchId": ObjectId,        // Nhập vào chi nhánh nào
  "supplierName": String,      // Tên nhà cung cấp
  "createdBy": ObjectId,       // User tạo phiếu
  "listProduct": [
    {
      "productId": ObjectId,
      "productName": String,        // Snapshot tên
      "quantity": Number,           // Số lượng nhập
      "importPrice": Number,        // 💰 Giá nhập LÚC ĐÓ
      "subtotal": Number            // quantity × importPrice
    }
  ],
  "totalAmount": Number,       // Tổng tiền phiếu nhập
  "status": String,            // "pending", "completed", "cancelled"
  "note": String,
  "createdAt": Date,
  "updatedAt": Date
}
```

---

### 7. Receipt (Hóa đơn bán hàng) ⭐ QUAN TRỌNG
```javascript
{
  "_id": ObjectId,
  "code": String,              // Mã hóa đơn: "HD001", "HD002"...
  "branchId": ObjectId,        // Bán tại chi nhánh nào
  "createdBy": ObjectId,       // Nhân viên bán hàng
  "listProduct": [
    {
      "productId": ObjectId,
      "productName": String,        // Snapshot tên
      "quantity": Number,           // Số lượng bán
      "salePrice": Number,          // 💰 Giá bán LÚC ĐÓ
      "costPrice": Number,          // 💰 GIÁ VỐN (avgImportPrice × quantity)
      "profit": Number              // 💰 (salePrice × quantity) - costPrice
    }
  ],
  "totalAmount": Number,       // Tổng tiền bán
  "totalCost": Number,         // Tổng giá vốn
  "totalProfit": Number,       // 💰 Tổng lợi nhuận
  "paymentMethod": String,     // "cash", "card", "transfer"
  "status": String,            // "completed", "cancelled"
  "createdAt": Date,
  "updatedAt": Date
}
```

---

## 💰 LOGIC TÍNH GIÁ VỐN TRUNG BÌNH

### Công thức:
```
newAvgPrice = (oldQty × oldAvgPrice + importQty × importPrice) / (oldQty + importQty)
```

### Ví dụ:
```javascript
// Tồn kho hiện tại: 100 sp, avgImportPrice = 10,000đ
// Nhập thêm: 50 sp, giá nhập = 12,000đ

newAvg = (100 × 10,000 + 50 × 12,000) / (100 + 50)
       = (1,000,000 + 600,000) / 150
       = 1,600,000 / 150
       = 10,666đ

// Cập nhật BranchProduct:
{
  stock: 150,
  avgImportPrice: 10666
}
```

---

## 🔄 LUỒNG NGHIỆP VỤ

### 1️⃣ NHẬP HÀNG

```javascript
// 1. Tạo phiếu nhập (status = "pending")
ImportReceipt {
  code: "PN001",
  listProduct: [
    { productId, productName, quantity: 50, importPrice: 12000, subtotal: 600000 }
  ],
  totalAmount: 600000,
  status: "pending"
}

// 2. Confirm phiếu nhập → Cập nhật BranchProduct
const oldQty = branchProduct.stock;           // 100
const oldAvg = branchProduct.avgImportPrice;  // 10000
const newQty = oldQty + 50;                   // 150
const newAvg = (100 * 10000 + 50 * 12000) / 150; // 10666

branchProduct.stock = 150;
branchProduct.avgImportPrice = 10666;

// 3. Update status = "completed"
```

### 2️⃣ BÁN HÀNG

```javascript
// 1. Lấy thông tin từ BranchProduct
const { stock, avgImportPrice } = await BranchProduct.getStockInfo(branchId, productId);
// stock = 150, avgImportPrice = 10666

// 2. Tính toán
const quantity = 30;
const salePrice = 15000;
const costPrice = avgImportPrice * quantity;  // 10666 × 30 = 319,980đ
const revenue = salePrice * quantity;         // 15000 × 30 = 450,000đ
const profit = revenue - costPrice;           // 450,000 - 319,980 = 130,020đ

// 3. Tạo Receipt
Receipt {
  code: "HD001",
  listProduct: [{
    productId,
    productName: "Coca Cola",
    quantity: 30,
    salePrice: 15000,
    costPrice: 319980,    // ← Lưu giá vốn tại thời điểm bán
    profit: 130020        // ← Lưu lợi nhuận
  }],
  totalAmount: 450000,
  totalCost: 319980,
  totalProfit: 130020
}

// 4. Trừ tồn kho
branchProduct.stock = 150 - 30 = 120;
// avgImportPrice giữ nguyên = 10666
```

### 3️⃣ HỦY ĐƠN HÀNG

```javascript
// 1. Lấy Receipt cần hủy
const receipt = await Receipt.findById(id);

// 2. Hoàn trả stock và tính lại avgImportPrice
for (const item of receipt.listProduct) {
  const oldQty = branchProduct.stock;
  const oldAvg = branchProduct.avgImportPrice;
  const restoreAvg = item.costPrice / item.quantity; // Giá vốn lúc bán
  const newQty = oldQty + item.quantity;
  const newAvg = (oldQty * oldAvg + item.quantity * restoreAvg) / newQty;

  branchProduct.stock = newQty;
  branchProduct.avgImportPrice = newAvg;
}

// 3. Update status = "cancelled"
```

---

## 📊 DASHBOARD - BÁO CÁO

### Doanh thu & Lợi nhuận
```javascript
const result = await Receipt.aggregate([
  {
    $match: {
      status: "completed",
      createdAt: { $gte: startDate, $lte: endDate },
      branchId: branchId
    }
  },
  {
    $group: {
      _id: null,
      totalRevenue: { $sum: "$totalAmount" },
      totalProfit: { $sum: "$totalProfit" },  // ← Lợi nhuận chính xác
      totalOrders: { $sum: 1 }
    }
  }
]);
```

### Doanh thu theo ngày
```javascript
const dailyStats = await Receipt.aggregate([
  { $match: { status: "completed", createdAt: { $gte: startDate, $lte: endDate } } },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      revenue: { $sum: "$totalAmount" },
      profit: { $sum: "$totalProfit" },
      orders: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

### Top sản phẩm bán chạy
```javascript
const topProducts = await Receipt.aggregate([
  { $match: { status: "completed" } },
  { $unwind: "$listProduct" },
  {
    $group: {
      _id: "$listProduct.productId",
      productName: { $first: "$listProduct.productName" },
      totalQuantity: { $sum: "$listProduct.quantity" },
      totalRevenue: { $sum: { $multiply: ["$listProduct.salePrice", "$listProduct.quantity"] } },
      totalProfit: { $sum: "$listProduct.profit" }
    }
  },
  { $sort: { totalQuantity: -1 } },
  { $limit: 10 }
]);
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

### 1. Snapshot dữ liệu
- Lưu `productName` vào Receipt/ImportReceipt để phòng sản phẩm bị xóa
- Lưu `costPrice` vào Receipt để giữ nguyên lợi nhuận khi giá thay đổi

### 2. Giá vốn trung bình
- Được tính lại mỗi khi NHẬP hàng
- KHÔNG thay đổi khi BÁN hàng
- Được hoàn trả khi HỦY đơn

### 3. Tại sao không dùng FIFO?
- FIFO phức tạp hơn (tracking từng lô)
- Weighted Average đủ chính xác cho shop bán lẻ
- Dễ implement và maintain

### 4. Phân quyền
- **Admin**: Toàn quyền, quản lý tất cả chi nhánh
- **Manager**: Quản lý chi nhánh của mình
- **Staff**: Chỉ bán hàng, xem báo cáo cơ bản

---

## 🎨 CÁC TAB GIAO DIỆN

1. **Dashboard**: Doanh thu, lợi nhuận, biểu đồ
2. **Quản lý loại sản phẩm**: CRUD Category
3. **Quản lý sản phẩm**: CRUD Product, cập nhật giá bán
4. **Quản lý nhập hàng**: Tạo phiếu nhập, xem lịch sử
5. **Quản lý hóa đơn**: Xem lịch sử bán hàng
6. **Quản lý kho**: Xem tồn kho + giá vốn TB theo chi nhánh
7. **Quản lý user** (Admin): CRUD User
8. **Quản lý chi nhánh** (Admin): CRUD Branch

---

## 📝 VÍ DỤ THỰC TẾ

### Kịch bản: Nhập và bán Coca Cola

```javascript
// === BƯỚC 1: Nhập hàng lần 1 ===
// Nhập 100 lon Coca, giá 10,000đ/lon
ImportReceipt {
  listProduct: [{ productId: "coca", quantity: 100, importPrice: 10000 }],
  totalAmount: 1000000
}
// → BranchProduct: { stock: 100, avgImportPrice: 10000 }

// === BƯỚC 2: Nhập hàng lần 2 ===
// Nhập thêm 50 lon Coca, giá TĂNG lên 12,000đ/lon
ImportReceipt {
  listProduct: [{ productId: "coca", quantity: 50, importPrice: 12000 }],
  totalAmount: 600000
}
// → newAvg = (100×10000 + 50×12000) / 150 = 10,666đ
// → BranchProduct: { stock: 150, avgImportPrice: 10666 }

// === BƯỚC 3: Bán hàng ===
// Bán 80 lon Coca, giá 15,000đ/lon
const costPrice = 10666 × 80 = 853,280đ
const revenue = 15000 × 80 = 1,200,000đ
const profit = 1,200,000 - 853,280 = 346,720đ

Receipt {
  listProduct: [{
    productName: "Coca Cola",
    quantity: 80,
    salePrice: 15000,
    costPrice: 853280,
    profit: 346720
  }],
  totalAmount: 1200000,
  totalCost: 853280,
  totalProfit: 346720
}
// → BranchProduct: { stock: 70, avgImportPrice: 10666 } (avg giữ nguyên)

// === KẾT QUẢ ===
// Doanh thu: 1,200,000đ
// Giá vốn: 853,280đ
// Lợi nhuận: 346,720đ ✅ CHÍNH XÁC
```

---

**Tạo bởi:** AI Assistant  
**Ngày:** 05/01/2026  
**Phiên bản:** 2.0 (Weighted Average Cost)
