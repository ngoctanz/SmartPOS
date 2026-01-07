# Hướng dẫn Quản lý Đa Chi nhánh

## Tổng quan

Dự án đã được cập nhật để hỗ trợ quản lý đa chi nhánh với các tính năng:

1. **Backend**: `branchId` được tự động thêm vào JWT token
2. **Middleware**: Tự động inject `branchId` cho staff/manager vào request
3. **Frontend**: Không cần thay đổi gì, backend tự động xử lý!

---

## 🔒 Bảo mật Chi nhánh (Branch Security)

### Kiến trúc Defense-in-Depth

Hệ thống sử dụng **2 lớp bảo vệ** để đảm bảo an toàn tối đa:

```
Request → Middleware Layer → Controller → Service Layer → Database
              ↓                              ↓
         injectUserBranch()           validateBranchAccess()
         checkBranchAccess()          buildSecureFilter()
         validateRecordBranchAccess() validateRecordAccess()
```

### Lớp 1: Middleware Layer (First Line of Defense)

#### 1. `injectUserBranch()` - Tự động inject branchId
- Áp dụng cho: GET (list), POST, PUT, PATCH
- Staff: Tự động inject branchId từ token vào `req.body` và `req.query`
- Admin: Phải truyền branchId cho các thao tác ghi (POST/PUT/PATCH)
- **Chặn**: Staff cố tình truyền branchId khác → 403 Forbidden

#### 2. `checkBranchAccess` - Kiểm tra quyền truy cập branch
- Áp dụng cho: Routes có `:branchId` trong params
- Staff: Chỉ được truy cập branchId của mình
- Admin: Được truy cập tất cả
- **Chặn**: Staff truy cập `/stock/branch/OTHER_BRANCH_ID` → 403 Forbidden

#### 3. `validateRecordBranchAccess` - Kiểm tra quyền truy cập record
- Áp dụng cho: GET /:id, GET /code/:code (xem chi tiết)
- Fetch record từ DB, kiểm tra branchId của record có khớp với user không
- **Chặn**: Staff xem hóa đơn của chi nhánh khác → 403 Forbidden

### Lớp 2: Service Layer (Second Line of Defense)

File: `BE/src/utils/branchSecurity.js`

#### 1. `validateBranchAccess(user, branchId, action)`
- Double-check quyền truy cập branch trước khi thực hiện thao tác
- Được gọi trong các service functions như `create()`, `getByBranch()`

#### 2. `buildSecureFilter(user, baseFilter)`
- Tự động thêm `branchId` vào filter cho staff
- Đảm bảo staff không thể bypass filter

#### 3. `validateRecordAccess(user, record, recordType)`
- Kiểm tra record có thuộc branch của user không
- Được gọi sau khi fetch record từ DB

### Lợi ích của Defense-in-Depth

| Scenario | Middleware | Service | Result |
|----------|------------|---------|--------|
| Normal request | ✅ Pass | ✅ Pass | Success |
| Middleware bug | ❌ Bypass | ✅ Block | Protected |
| Dev quên middleware | ❌ Missing | ✅ Block | Protected |
| Both layers fail | ❌ Fail | ❌ Fail | Vulnerable |

**Xác suất bị tấn công thành công = P(middleware fail) × P(service fail) ≈ 0**

### Bảng tổng hợp bảo mật

| Route | Middleware | Mô tả |
|-------|------------|-------|
| `GET /receipt` | `injectUserBranch` | Staff chỉ thấy hóa đơn chi nhánh mình |
| `GET /receipt/:id` | `validateRecordBranchAccess` | Staff chỉ xem được hóa đơn chi nhánh mình |
| `GET /receipt/code/:code` | `validateRecordBranchAccess` | Staff chỉ xem được hóa đơn chi nhánh mình |
| `POST /receipt` | `injectUserBranch` | Tự động gán branchId của staff |
| `GET /stock/branch/:branchId` | `checkBranchAccess` | Staff chỉ xem được kho chi nhánh mình |
| `GET /import-receipt/:id` | `validateRecordBranchAccess` | Staff chỉ xem được phiếu nhập chi nhánh mình |

### Ví dụ tấn công bị chặn

```javascript
// ❌ Staff cố tình truyền branchId khác
POST /receipt
{ "branchId": "OTHER_BRANCH_ID", "items": [...] }
// → 403: "You can only access your own branch"

// ❌ Staff cố xem hóa đơn chi nhánh khác
GET /receipt/HD001  // HD001 thuộc chi nhánh khác
// → 403: "You do not have access to this record"

// ❌ Staff cố xem kho chi nhánh khác
GET /stock/branch/OTHER_BRANCH_ID
// → 403: "You do not have access to this branch"
```

---

## Backend Changes

### 1. JWT Token bao gồm branchId

File: `BE/src/services/authService.js`

Token payload bây giờ bao gồm:
```javascript
{
  userId: user._id,
  userName: user.userName,
  email: user.email,
  role: user.role,
  branchId: user.branchId  // ✅ Mới thêm
}
```

### 2. Middleware tự động inject branchId

File: `BE/src/middlewares/branchMiddleware.js`

- `injectUserBranch`: Tự động inject `branchId` từ token vào `req.body` và `req.query`
- Chỉ áp dụng cho **staff** và **manager**
- **Admin** không bị ảnh hưởng (có thể chỉ định branchId tùy ý)

### 3. Routes đã được cập nhật

Các routes sau đã thêm middleware `injectUserBranch`:

- `BE/src/routes/v1/receiptRouter.js`
- `BE/src/routes/v1/importReceiptRouter.js`
- `BE/src/routes/v1/stockRouter.js`
- `BE/src/routes/v1/dashboardRouter.js`

```javascript
Router.use(authMiddleware);
Router.use(injectUserBranch()); // ✅ Factory function - tự động inject branchId

// Hoặc với options
Router.use(injectUserBranch({ requireBranchForWrite: true })); // Admin phải truyền branchId cho POST/PUT/PATCH
Router.use(injectUserBranch({ requireBranchForWrite: false })); // Không bắt buộc branchId
```

### 4. Controllers đã được đơn giản hóa

Controllers không còn cần query database để lấy branchId:

**Trước:**
```javascript
const user = await User.findById(req.user.userId).lean();
if (user && user.branchId) {
  filter.branchId = user.branchId;
}
```

**Sau:**
```javascript
// branchId đã được inject từ middleware
if (req.user.role !== 'admin' && req.user.branchId) {
  filter.branchId = req.user.branchId;
}
```

---

## Frontend Changes

### User Interface đã bao gồm branchId

File: `fe/contexts/auth-context.tsx`

```typescript
export interface User {
  _id: string;
  userName: string;
  name?: string;
  role: "admin" | "manager" | "staff";
  branchId?: string;  // ✅ Đã có sẵn từ token
  isActive: boolean;
}
```

**Lưu ý**: Frontend **KHÔNG CẦN** thay đổi code! Backend middleware đã tự động inject `branchId` từ token vào request.

---

## Cách sử dụng

### Backend

#### Tạo Receipt (Hóa đơn bán)

**Staff/Manager:**
```javascript
// Request body không cần branchId
POST /v1/receipt
{
  "items": [...],
  "totalAmount": 100000,
  "paymentMethod": "cash"
}

// Middleware tự động inject branchId từ token
// req.body.branchId = user.branchId
```

**Admin:**
```javascript
// Admin phải chỉ định branchId
POST /v1/receipt
{
  "branchId": "673abc...",  // ✅ Bắt buộc cho admin
  "items": [...],
  "totalAmount": 100000,
  "paymentMethod": "cash"
}
```

#### Get Receipts

**Staff/Manager:**
```javascript
// Tự động filter theo branchId của user
GET /v1/receipt
// Middleware inject: req.query.branchId = user.branchId
```

**Admin:**
```javascript
// Có thể filter theo branchId hoặc xem tất cả
GET /v1/receipt?branchId=673abc...
GET /v1/receipt  // Xem tất cả chi nhánh
```

### Frontend

#### Staff/Manager - Không cần truyền branchId

```typescript
import receiptService from "@/service/receipt.service";

function MyComponent() {
  // Tạo receipt - KHÔNG CẦN truyền branchId
  const handleCreate = async () => {
    await receiptService.create({
      items: [...],
      totalAmount: 100000,
      paymentMethod: "cash"
      // ✅ Backend tự động inject branchId từ token
    });
  };

  // Get receipts - KHÔNG CẦN truyền branchId
  const handleFetch = async () => {
    await receiptService.getAll({ 
      status: 'completed' 
      // ✅ Backend tự động filter theo branchId từ token
    });
  };
}
```

#### Admin - Phải chỉ định branchId

```typescript
import receiptService from "@/service/receipt.service";
import { useAuthContext } from "@/contexts/auth-context";

function MyComponent() {
  const { user } = useAuthContext();
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const handleCreate = async () => {
    // Admin PHẢI chỉ định branchId
    await receiptService.create({
      branchId: selectedBranchId,  // ✅ Bắt buộc cho admin
      items: [...],
      totalAmount: 100000,
      paymentMethod: "cash"
    });
  };

  // Admin có thể xem tất cả hoặc filter theo branchId
  const handleFetch = async () => {
    if (selectedBranchId) {
      await receiptService.getAll({ branchId: selectedBranchId });
    } else {
      await receiptService.getAll(); // Xem tất cả chi nhánh
    }
  };
}
```

---

## Quy tắc

### Backend

1. ✅ **Staff/Manager**: Không cần gửi `branchId` trong request, middleware tự động inject
2. ✅ **Admin**: Phải chỉ định `branchId` khi tạo/cập nhật dữ liệu
3. ✅ **Admin**: Có thể xem tất cả chi nhánh (không filter theo branchId)
4. ✅ **Staff/Manager**: Chỉ xem/thao tác dữ liệu của chi nhánh mình

### Frontend

1. ✅ **Staff/Manager**: Không cần truyền branchId vào service calls (backend tự động inject)
2. ✅ **Admin**: Phải chỉ định branchId khi tạo/cập nhật dữ liệu
3. ✅ **Admin**: Có thể xem tất cả chi nhánh hoặc filter theo branchId
4. ✅ **Không cần thay đổi code hiện tại** - backend xử lý tất cả!

---

## Testing

### Test với Staff/Manager

1. Login với tài khoản staff/manager
2. Token sẽ chứa branchId
3. Tạo receipt không cần truyền branchId
4. Get receipts sẽ tự động filter theo branchId

### Test với Admin

1. Login với tài khoản admin
2. Token không có branchId hoặc có thể có
3. Tạo receipt phải truyền branchId
4. Get receipts có thể xem tất cả hoặc filter theo branchId

---

## Migration Guide

### Cập nhật code cũ

**Trước (Staff/Manager phải truyền branchId thủ công):**
```typescript
const { user } = useAuthContext();
await receiptService.create({
  branchId: user.branchId,  // ❌ Không cần nữa
  items: [...]
});
```

**Sau (Backend tự động inject):**
```typescript
// Staff/Manager: Không cần truyền branchId
await receiptService.create({
  items: [...]  // ✅ Backend tự động inject branchId từ token
});
```

**Admin vẫn phải truyền branchId:**
```typescript
await receiptService.create({
  branchId: selectedBranchId,  // ✅ Admin phải chỉ định
  items: [...]
});
```

---

## Lưu ý

1. **Token expiry**: Token mới sẽ chứa branchId, user cần login lại hoặc refresh token
2. **Admin flexibility**: Admin vẫn có thể chỉ định branchId tùy ý
3. **Backward compatibility**: Code cũ vẫn hoạt động nếu truyền branchId explicit
4. **Security**: Middleware kiểm tra user không thể truy cập chi nhánh khác

---

## Troubleshooting

### Lỗi: "User does not belong to any branch"

- User không có branchId trong database
- Cần cập nhật user với branchId hợp lệ

### Lỗi: "You do not have access to this branch"

- Staff/Manager đang cố truy cập chi nhánh khác
- Check `checkBranchAccess` middleware

### Token không có branchId

- User cần login lại để nhận token mới
- Hoặc gọi refresh token API

---

## API Endpoints đã cập nhật

### Receipts (Hóa đơn bán)
- `GET /v1/receipt` - ✅ Auto-filter by branchId
- `POST /v1/receipt` - ✅ Auto-inject branchId
- `GET /v1/receipt/revenue` - ✅ Auto-filter by branchId
- `GET /v1/receipt/daily-revenue` - ✅ Auto-filter by branchId

### Import Receipts (Phiếu nhập)
- `GET /v1/import-receipt` - ✅ Auto-filter by branchId
- `POST /v1/import-receipt` - ✅ Auto-inject branchId
- `GET /v1/import-receipt/total` - ✅ Auto-filter by branchId

### Stock (Kho hàng)
- `GET /v1/stock` - ✅ Auto-filter by branchId
- `POST /v1/stock` - ✅ Auto-inject branchId
- `PUT /v1/stock/:id` - ✅ Auto-inject branchId

---

## Kết luận

Hệ thống đã được cập nhật để tự động quản lý branchId:

✅ **Backend**: Token chứa branchId, middleware tự động inject vào request
✅ **Frontend**: KHÔNG CẦN thay đổi code! Backend xử lý tất cả
✅ **Security**: Middleware kiểm tra quyền truy cập chi nhánh
✅ **Flexibility**: Admin vẫn có thể chỉ định branchId tùy ý

**Staff/Manager**: Gọi API bình thường, không cần truyền branchId
**Admin**: Phải chỉ định branchId khi tạo/cập nhật dữ liệu

Đơn giản và tự động! 🎉
