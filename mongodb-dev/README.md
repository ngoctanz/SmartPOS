# SmartPOS MongoDB Development Database

MongoDB database cho team development của dự án SmartPOS - Hệ thống quản lý bán hàng mini mart.

## 🚀 Khởi động MongoDB (Chỉ cần 1 lệnh!)

### Chạy standalone (Development)

```bash
cd mongodb-dev
docker-compose up -d
```

### Chạy cùng toàn bộ dự án SmartPOS (Production)

```bash
# Từ thư mục root dự án
docker-compose up -d
```

MongoDB sẽ tự động chạy cùng backend và frontend, sử dụng cùng 1 database SmartPOS.

## 📋 Thông tin truy cập

- **Username:** `admin`
- **Password:** `admin@123`
- **Database:** `SmartPOS`
- **Port:** `27017`

## 🔗 Connection String

### Kết nối từ VPS (Cho team development)

```
***REMOVED***
```

### Kết nối từ localhost (Nếu chạy local)

```
***REMOVED***
```

### Kết nối bằng MongoDB Compass

1. Mở MongoDB Compass
2. Nhập connection string:
   ```
   ***REMOVED***
   ```
3. Hoặc điền thủ công:
   - **Host:** `127.0.0.1`
   - **Port:** `27017`
   - **Authentication:** `Username / Password`
   - **Username:** `admin`
   - **Password:** `admin@123`
   - **Authentication Database:** `SmartPOS`

### Ví dụ code kết nối

**Node.js (Mongoose):**

```javascript
const mongoose = require("mongoose");
mongoose.connect("***REMOVED***");
```

**Node.js (MongoDB Native Driver):**

```javascript
const { MongoClient } = require("mongodb");
const uri = "***REMOVED***";
const client = new MongoClient(uri);
```

## 🛠️ Lệnh quản lý

### Kiểm tra trạng thái

```bash
docker ps | grep smartpos-mongodb
```

### Xem logs

```bash
docker logs smartpos-mongodb-dev
```

### Dừng MongoDB

```bash
docker-compose down
```

### Xóa toàn bộ (bao gồm data)

```bash
docker-compose down -v
```

### Restart MongoDB

```bash
docker-compose restart
```

## 🔒 Bảo mật

⚠️ **LƯU Ý:**

- Mật khẩu `admin@123` chỉ dùng cho development
- Trong production, đổi mật khẩu mạnh hơn trong file `init-mongo.js` và `docker-compose.yml`
- Chỉ mở public port 27017 trong môi trường development
- Production nên dùng VPN hoặc IP whitelist

## 📝 Truy cập MongoDB Shell

```bash
docker exec -it smartpos-mongodb-dev mongosh -u admin -p "admin@123" --authenticationDatabase SmartPOS
```

Sau khi vào shell, bạn có thể chạy các lệnh MongoDB:

```javascript
// Xem các collections
show collections

// Thêm dữ liệu mẫu
db.products.insertOne({ name: "Coca Cola", price: 15000 })

// Query dữ liệu
db.products.find()
```

## 🌐 Setup VPS và cho phép team truy cập

### 1. Mở port firewall trên VPS

Truy cập VPS:

```bash
ssh root@127.0.0.1 -p 26266
```

Mở port MongoDB:

```bash
# Ubuntu/Debian
sudo ufw allow 27017/tcp
sudo ufw reload

# Hoặc dùng iptables
sudo iptables -A INPUT -p tcp --dport 27017 -j ACCEPT
sudo iptables-save
```

### 2. Chia sẻ thông tin với team

**Thông tin kết nối cho team:**

```
IP Server: 127.0.0.1
Port: 27017
Username: admin
Password: admin@123
Database: SmartPOS

Connection String:
***REMOVED***
```

**Copy & Paste cho team:**

```
Kết nối MongoDB SmartPOS:
- Host: 127.0.0.1:27017
- User: admin
- Pass: admin@123
- DB: SmartPOS
- Connection String: ***REMOVED***
```

## ❓ Troubleshooting

### Không kết nối được từ máy khác?

- Kiểm tra firewall đã mở port 27017
- Đảm bảo Docker đang chạy và container đang up
- Kiểm tra IP server có đúng không

### Lỗi authentication?

- Đảm bảo đang dùng đúng username/password
- Database name phải là `SmartPOS` (case-sensitive)

### Container bị dừng liên tục?

```bash
docker logs smartpos-mongodb-dev
```

Xem logs để debug vấn đề.
