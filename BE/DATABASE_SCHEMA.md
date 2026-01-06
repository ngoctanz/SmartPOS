# 📊 DATABASE SCHEMA - PHIÊN BẢN ĐƠN GIẢN

## 🎯 Tổng quan

Hệ thống quản lý bán hàng đa chi nhánh (POS) - Phiên bản tối giản.

---

## 🔑 NGUYÊN TẮC

```
Doanh thu = Tổng tiền từ Receipt (hóa đơn bán)
Vốn       = Tổng tiền từ ImportReceipt (phiếu nhập)
Lãi       = Doanh thu - Vốn (tính trên Dashboard)
```

**Không cần:**
- ❌ Giá vốn trung bình
- ❌ Tính profit từng đơn hàng
- ❌ Tracking phức tạp

---

## 📦 CẤU TRÚC DATABASE

### 1. Category
```javascript
{
  "_id": ObjectId,
  "name": String,
  "desc": String,
  "isDeleted": Boolean,
  "createdAt": Date,
  "updatedAt": Date
}
```

### 2. Product
```javascript
{
  "_id": ObjectId,
  "categoryId": ObjectId,
  "name": String,
  "desc": String,
  "barcode": String,
  "unit": String,
  "image": String,
  "currentSalePrice": Number,  // Giá bán hiện tại
  "isDeleted": Boolean,
  "createdAt": Date,
  "updatedAt": Date
}
```

### 3. Branch
```javascript
{
  "_id": ObjectId,
  "branchName": String,
  "address": String,
  "contactInfo": String,
  "isDeleted": Boolean,
  "createdAt": Date,
  "updatedAt": Date
}
```

### 4. BranchProduct (Tồn kho)
```javascript
{
  "_id": ObjectId,
  "branchId": ObjectId,
  "productId": ObjectId,
  "stock": Number,      // Số lượng tồn
  "minStock": Number,   // Cảnh báo hết hàng
  "updatedAt": Date
}
```

### 5. User
```javascript
{
  "_id": ObjectId,
  "userName": String,
  "email": String,
  "phone": String,
  "name": String,
  "password": String,
  "role": String,        // "admin", "manager", "staff"
  "branchId": ObjectId,
  "status": String,      // "active", "inactive"
  "createdAt": Date,
  "updatedAt": Date
}
```

### 6. ImportReceipt (Phiếu nhập)
```javascript
{
  "_id": ObjectId,
  "code": String,           // "PN001", "PN002"...
  "branchId": ObjectId,
  "supplierName": String,
  "createdBy": ObjectId,
  "listProduct": [{
    "productId": ObjectId,
    "productName": String,
    "quantity": Number,
    "importPrice": Number,
    "subtotal": Number
  }],
  "totalAmount": Number,    // Tổng tiền nhập
  "status": String,         // "pending", "completed", "cancelled"
  "note": String,
  "createdAt": Date,
  "updatedAt": Date
}
```

### 7. Receipt (Hóa đơn bán)
```javascript
{
  "_id": ObjectId,
  "code": String,           // "HD001", "HD002"...
  "branchId": ObjectId,
  "createdBy": ObjectId,
  "listProduct": [{
    "productId": ObjectId,
    "productName": String,
    "quantity": Number,
    "salePrice": Number
  }],
  "totalAmount": Number,    // Tổng tiền bán
  "paymentMethod": String,  // "cash", "card", "transfer"
  "status": String,         // "completed", "cancelled"
  "createdAt": Date,
  "updatedAt": Date
}
```

---

## 🔄 LUỒNG NGHIỆP VỤ

### Nhập hàng
```
1. Tạo ImportReceipt (status = "pending")
2. Confirm → status = "completed"
3. Tăng stock trong BranchProduct
```

### Bán hàng
```
1. Check stock đủ không
2. Tạo Receipt (status = "completed")
3. Giảm stock trong BranchProduct
```

### Hủy đơn
```
1. Update Receipt status = "cancelled"
2. Hoàn trả stock
```

---

## 📊 DASHBOARD

```javascript
// Doanh thu tháng
const revenue = await Receipt.aggregate([
  { $match: { status: "completed", createdAt: { $gte: startMonth, $lte: endMonth } } },
  { $group: { _id: null, total: { $sum: "$totalAmount" } } }
])

// Vốn tháng
const cost = await ImportReceipt.aggregate([
  { $match: { status: "completed", createdAt: { $gte: startMonth, $lte: endMonth } } },
  { $group: { _id: null, total: { $sum: "$totalAmount" } } }
])

// Lãi = revenue - cost
```

---

## ⚠️ LƯU Ý

Cách tính đơn giản này **KHÔNG CHÍNH XÁC 100%** khi:
- Nhập nhiều nhưng bán ít trong tháng → Hiển thị LỖ
- Bán hàng tồn từ tháng trước → Hiển thị LÃI ảo

**Phù hợp cho:** Shop nhỏ, nhập-bán đều đặn, không cần báo cáo chi tiết.

---

## 🎨 CÁC TAB GIAO DIỆN

1. **Dashboard**: Doanh thu, vốn, lãi (ước tính)
2. **Quản lý loại sản phẩm**: CRUD Category
3. **Quản lý sản phẩm**: CRUD Product
4. **Quản lý nhập hàng**: Tạo/xem phiếu nhập
5. **Quản lý hóa đơn**: Xem hóa đơn bán
6. **Quản lý kho**: Xem tồn kho
7. **Quản lý user** (Admin)
8. **Quản lý chi nhánh** (Admin)

---

**Phiên bản:** 3.0 (Simplified)
