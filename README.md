# 🛒 SmartPOS - Hệ thống Quản lý Bán hàng Mini Mart

SmartPOS là một hệ thống quản lý bán hàng toàn diện dành cho cửa hàng bán lẻ và siêu thị mini. Hệ thống được thiết kế tối ưu hóa cho cả nghiệp vụ bán hàng tại quầy (POS), quản lý kho, nhập hàng và báo cáo doanh thu với giao diện hiện đại và real-time.

---

## ✨ Các chức năng chính (Features)

1. **Quản lý Bán hàng (POS / Receipt)**
   - Tạo hóa đơn, tính tiền nhanh chóng, giao diện thân thiện với thiết bị quét mã vạch.
   - Quản lý giỏ hàng, tùy chỉnh số lượng, giảm giá.
   - Hỗ trợ thanh toán tiền mặt và chuyển khoản (Tích hợp quét mã QR tự động qua PayOS).
   - Tích hợp in hóa đơn trực tiếp tại quầy (Fast Print & Optimistic Print).
2. **Quản lý Hàng hóa & Kho (Products)**
   - Thêm, sửa, xóa sản phẩm, danh mục sản phẩm (Categories).
   - Quản lý giá bán, giá nhập, tồn kho.
   - Hỗ trợ nhập xuất hàng hóa qua file Excel.
3. **Quản lý Nhập hàng (Import Receipts)**
   - Tạo phiếu nhập kho từ nhà cung cấp.
   - Theo dõi lịch sử nhập hàng, trạng thái hoàn thành / lỗi phiếu nhập.
4. **Quản lý Chi nhánh (Branches) & Nhân sự (Users)**
   - Hỗ trợ đa chi nhánh, phân quyền dữ liệu theo chi nhánh làm việc.
   - Phân quyền tài khoản (Admin, Nhân viên bán hàng).
5. **Báo cáo Thống kê (Dashboard & Analytics)**
   - Biểu đồ thống kê doanh thu theo ngày, tuần, tháng (Line/Bar charts).
   - Phân tích Top sản phẩm bán chạy, sản phẩm bán chậm, hiệu quả theo chi nhánh.
6. **Thời gian thực (Real-time update)**
   - Cập nhật trạng thái thanh toán QR tự động thông qua Socket.IO.

---

## 🛠 Công nghệ sử dụng (Tech Stack)

### Frontend
- **Framework:** Next.js (App Router), React 19
- **Styling & UI:** Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Framer Motion
- **Data Visualization:** Recharts
- **State Management & Data fetching:** React Hooks, Custom Hooks, Context API
- **Real-time:** Socket.IO Client
- **Forms & Validation:** React Hook Form, Zod
- **Khác:** Next Themes (Dark/Light mode), XLSX (Xử lý Excel), QRCode.react

### Backend
- **Core:** Node.js, Express.js
- **Database:** MongoDB, Mongoose ODM
- **Authentication:** JWT (JSON Web Token), Bcrypt
- **Validation:** Joi
- **Real-time:** Socket.IO
- **Third-party Integration:** 
  - Cloudinary (Quản lý hình ảnh sản phẩm)
  - PayOS (Cổng thanh toán QR Code tự động)
  - Multer (Xử lý upload file)

### DevOps & Infrastructure
- Docker & Docker Compose
- Nginx (Reverse Proxy)

---

## 🛡 Xử lý Ngoại lệ (Exception Handling)

Hệ thống được thiết kế với cơ chế xử lý lỗi tập trung (Global Error Handling), đảm bảo ứng dụng luôn ổn định và trả về response thân thiện với người dùng/Frontend.

### 1. Tại Backend
- **Custom Error Class (`ApiError`)**: Mọi lỗi ném ra từ Controller/Service đều sử dụng class `ApiError` kế thừa từ `Error` mặc định của NodeJS, cho phép đính kèm `statusCode` dễ dàng.
- **Global Error Middleware (`errorHandlingMiddleware.js`)**: Bắt toàn bộ các exception chưa được catch trong hệ thống.
  - **Lỗi MongoDB Duplicate Key (Code 11000)**: Tự động phát hiện các field bị trùng lặp (ví dụ: email, phone) và việt hóa câu thông báo lỗi (VD: *"Số điện thoại đã tồn tại trong hệ thống"*).
  - **Lỗi MongoDB Validation**: Gom nhóm tất cả các lỗi vi phạm schema của Mongoose (`ValidationError`) thành một câu thông báo rõ ràng (`Bad Request 400`).
  - **Lỗi Sai định dạng ID (`CastError`)**: Tự động bắt lỗi truyền sai định dạng `ObjectId` và trả về 400.
  - **Chuẩn hóa API Response**: Mọi lỗi trả về cho Frontend luôn tuân theo một format chuẩn mực:
    ```json
    {
      "success": false,
      "statusCode": 400,
      "message": "Thông báo lỗi đã được xử lý thân thiện"
    }
    ```
  - **Bảo mật Stack Trace**: Chỉ hiển thị `stack trace` trong môi trường Development (`NODE_ENV=dev`) để dễ debug, và tự động ẩn khi lên Production để tránh rò rỉ cấu trúc code.
- **Not Found Handler**: Có middleware riêng bắt các endpoint không tồn tại và trả về 404 chuẩn.

### 2. Tại Frontend
- Hệ thống sử dụng custom hook `useErrorHandler` và interceptor để bắt các response lỗi từ Backend.
- Tự động hiển thị **Toast Message** (qua thư viện Sonner) thân thiện với người dùng cuối dựa trên `message` được Backend trả về.

---

## 🚀 Hướng dẫn cài đặt & Chạy (Local Development)

Dự án đã được cấu hình Docker hoàn chỉnh, giúp bạn chạy trọn bộ hệ thống chỉ với một lệnh duy nhất.

### Yêu cầu
- Đã cài đặt [Docker](https://www.docker.com/) và Docker Compose.

### Các bước chạy
1. Clone dự án về máy.
2. Tại thư mục gốc của dự án, mở terminal và chạy lệnh:
   ```bash
   docker-compose up -d
   ```
3. Đợi vài phút để Docker pull image và build Frontend/Backend. Sau khi hoàn tất:
   - **Giao diện người dùng (Frontend):** Truy cập `http://localhost`
   - **Backend API:** Truy cập `http://localhost:8081/v1`
   - **MongoDB Local:** Truy cập qua `***REMOVED***` (nếu cần xem data)

> **Lưu ý:** Codebase đã được cấu hình sẵn môi trường Local (loại bỏ các domain production), an toàn và sẵn sàng để chạy trên mọi máy tính.
