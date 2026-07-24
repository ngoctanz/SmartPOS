# SmartPOS

Hệ thống demo quản lý bán hàng và kho dành cho cửa hàng bán lẻ, hỗ trợ nghiệp vụ tại quầy, nhập hàng, quản lý tồn kho, nhiều chi nhánh và báo cáo doanh thu.

**Demo:** [smart-pos-demo.vercel.app](https://smart-pos-demo.vercel.app)

![Trang chủ SmartPOS](FE/public/images/demo/Screenshot%20From%202026-07-24%2016-56-09.png)

## Mô tả dự án

SmartPOS là dự án demo mô phỏng quy trình vận hành cơ bản của một cửa hàng bán lẻ: quản lý hàng hóa, nhập kho, bán hàng, in hóa đơn và theo dõi số liệu kinh doanh. Dự án được xây dựng nhằm minh họa khả năng phát triển một ứng dụng full-stack với giao diện responsive, API riêng, xác thực người dùng và kiến trúc sẵn sàng triển khai bằng Docker.

Phiên bản hiện tại tập trung vào trải nghiệm giao diện và các luồng nghiệp vụ cốt lõi, chưa phải sản phẩm thương mại hoàn chỉnh.

## Giới hạn hiện tại

- Một số tính năng và trường dữ liệu đã được tinh giản để phù hợp với phạm vi demo.
- Thanh toán QR qua PayOS đang tạm ngưng.
- Cập nhật thời gian thực qua WebSocket/Socket.IO đang tạm ngưng.
- Một số chức năng nâng cao về phân quyền, báo cáo, đối soát và vận hành thực tế chưa được triển khai đầy đủ.
- Dữ liệu trên bản demo có thể được thay đổi hoặc đặt lại mà không báo trước.

> Không nên sử dụng phiên bản demo cho giao dịch hoặc dữ liệu kinh doanh thực tế.

## Tính năng chính

- Tạo hóa đơn bằng tìm kiếm hoặc quét mã vạch; thanh toán tiền mặt và in hóa đơn.
- Quản lý sản phẩm, danh mục, giá bán, tồn kho, hình ảnh và mã vạch.
- Nhập hàng thủ công hoặc bằng Excel, theo dõi lịch sử và trạng thái phiếu nhập.
- Tra cứu, lọc, đánh dấu lỗi và quản lý trạng thái hóa đơn.
- Quản lý nhiều chi nhánh, tài khoản và phân quyền admin/nhân viên.
- Dashboard thống kê doanh thu, sản phẩm và hiệu quả theo chi nhánh.
- Giao diện responsive, hỗ trợ chế độ sáng/tối.

## Hình ảnh

### Quản lý sản phẩm

![Quản lý sản phẩm](FE/public/images/demo/Screenshot%20From%202026-07-24%2016-56-59.png)

### Tạo phiếu nhập hàng

![Tạo phiếu nhập hàng](FE/public/images/demo/Screenshot%20From%202026-07-24%2016-57-21.png)

### Bán hàng và in hóa đơn

![Tạo hóa đơn](FE/public/images/demo/Screenshot%20From%202026-07-24%2016-57-43.png)

![In hóa đơn](FE/public/images/demo/Screenshot%20From%202026-07-24%2016-57-49.png)

### Quản lý hóa đơn

![Quản lý hóa đơn](FE/public/images/demo/Screenshot%20From%202026-07-24%2016-58-00.png)

## Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| UI | Radix UI, TanStack Table, Recharts, Lucide, Tabler Icons |
| Form & validation | React Hook Form, Zod |
| Backend | Node.js 22, Express 5 |
| Database | MongoDB, Mongoose |
| Xác thực | JWT, bcrypt, HTTP-only cookie |
| Thời gian thực | Socket.IO (tạm ngưng trên bản demo) |
| Tích hợp | PayOS (tạm ngưng), Cloudinary, XLSX, QR code, barcode |
| Hạ tầng | Docker, Docker Compose, Nginx, Next.js Standalone |

## Cấu trúc dự án

```text
SmartPOS/
├── BE/             REST API, Socket.IO và nghiệp vụ
├── FE/             Ứng dụng Next.js
├── mongodb-dev/    Cấu hình MongoDB cho môi trường phát triển
├── nginx/          Reverse proxy
└── docker-compose.yml
```

## Chạy toàn bộ hệ thống bằng Docker

### Yêu cầu

- Docker và Docker Compose
- MongoDB đang hoạt động (local hoặc cloud)

Tạo cấu hình backend:

```bash
git clone https://github.com/ngoctanz/SmartPOS.git
cd SmartPOS
cp BE/.env.example BE/.env
```

Cập nhật tối thiểu `MONGO_DB_URI`, `DATABASE_NAME` và `JWT_SECRET` trong `BE/.env`, sau đó chạy:

```bash
docker compose up -d --build
```

| Dịch vụ | Địa chỉ |
| --- | --- |
| Ứng dụng qua Nginx | [http://localhost](http://localhost) |
| Frontend trực tiếp | [http://localhost:3000](http://localhost:3000) |
| Backend API | [http://localhost:8081/v1](http://localhost:8081/v1) |
| Health check | [http://localhost:8081/v1/health](http://localhost:8081/v1/health) |

Dừng hệ thống:

```bash
docker compose down
```

## Chạy từng phần khi phát triển

Yêu cầu Node.js 22 trở lên, npm và MongoDB.

### Backend

```bash
cd BE
cp .env.example .env
npm ci
npm run dev
```

Backend sử dụng `APP_HOST` và `APP_PORT` trong `BE/.env`.

### Frontend

Tạo `FE/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8081/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:8081
```

Sau đó chạy:

```bash
cd FE
npm ci
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Biến môi trường

### Backend — `BE/.env`

| Biến | Ví dụ | Mô tả |
| --- | --- | --- |
| `APP_HOST` | `0.0.0.0` | Host backend |
| `APP_PORT` | `8081` | Cổng backend |
| `NODE_ENV` | `dev` | Môi trường chạy |
| `CLIENT_URL` | `http://localhost:3000` | Frontend được phép kết nối |
| `MONGO_DB_URI` | `mongodb://localhost:27017` | Chuỗi kết nối MongoDB |
| `DATABASE_NAME` | `smartpos` | Tên database |
| `JWT_SECRET` | giá trị bí mật | Khóa ký access token |
| `CLOUDINARY_CLOUD_NAME` | tùy chọn | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | tùy chọn | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | tùy chọn | Cloudinary API secret |
| `PAYOS_CLIENT_ID` | tùy chọn | PayOS client ID |
| `PAYOS_API_KEY` | tùy chọn | PayOS API key |
| `PAYOS_CHECKSUM_KEY` | tùy chọn | PayOS checksum key |

Thông tin PayOS cũng có thể cấu hình riêng theo từng chi nhánh. Không commit file `.env` hoặc khóa thật lên repository.

### Frontend — `FE/.env.local`

| Biến | Mặc định | Mô tả |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8081/v1` | URL gốc của REST API |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:8081` | URL máy chủ Socket.IO |
| `NEXT_PUBLIC_APP_NAME` | `SmartPOS` | Tên ứng dụng |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | URL frontend |
| `NEXT_PUBLIC_API_TIMEOUT` | `30000` | Thời gian chờ API (ms) |
| `NEXT_PUBLIC_MAX_IMAGE_SIZE` | `5242880` | Dung lượng ảnh tối đa (byte) |

Ảnh tải lên hỗ trợ JPEG, PNG và WebP; mặc định tối đa 5 MB.

## Scripts

| Thư mục | Lệnh | Chức năng |
| --- | --- | --- |
| `FE` | `npm run dev` | Chạy frontend development |
| `FE` | `npm run build` | Build frontend production |
| `FE` | `npm run start` | Chạy frontend production |
| `FE` | `npm run lint` | Kiểm tra frontend với ESLint |
| `BE` | `npm run dev` | Chạy backend với nodemon |
| `BE` | `npm start` | Chạy backend production |

## Giấy phép

Backend khai báo giấy phép ISC. Repository chưa có file giấy phép chung.
