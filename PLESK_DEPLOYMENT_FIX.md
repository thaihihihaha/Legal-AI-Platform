# Hướng Dẫn Xử Lý Lỗi Khi Deploy Lên Plesk (legalmb.cloud)

## 🔴 Vấn đề 1: F5 Reload → Lỗi 500

**Nguyên nhân:**
- Khi reload tại `/login`, server Express cố tìm route `/login` nhưng không tồn tại
- Frontend là SPA (Single Page Application) - tất cả routes đều xử lý bởi React Router, không phải Express
- Cần cấu hình Express để fallback tất cả route về `index.html`

**Giải pháp:**

Thêm middleware vào `server/src/app.js` để serve frontend static files:

```javascript
// Sau dòng: app.use('/uploads', express.static(UPLOAD_DIR));

// ──────────────────────────────────────────────────────
// SERVE FRONTEND STATIC FILES (BUILD PRODUCTION)
// ──────────────────────────────────────────────────────
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticPath = path.join(__dirname, '../../client/dist');

// Serve static files từ frontend build
app.use(express.static(staticPath, {
  maxAge: '1d', // Cache 1 ngày
  etag: false
}));

// ──────────────────────────────────────────────────────
// SPA FALLBACK ROUTE - Rất quan trọng!
// ──────────────────────────────────────────────────────
// Tất cả requests không match /v1/* hoặc /uploads/* đều serve index.html
// Để React Router xử lý routing
app.get('*', (req, res) => {
  // Bỏ qua API routes
  if (req.path.startsWith('/v1/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  res.sendFile(path.join(staticPath, 'index.html'));
});
```

---

## 🔴 Vấn đề 2: Lỗi "Unexpected token '<', "<!doctype"... is not valid JSON"

**Nguyên nhân:**
- Khi gọi API endpoint đăng nhập, server trả về HTML thay vì JSON
- Điều này thường xảy ra khi:
  1. **CORS bị block** - Frontend không thể gọi backend API
  2. **API endpoint URL không đúng** - Frontend gọi sai path
  3. **Endpoint không tồn tại** - Express trả error page HTML
  4. **Protocol mismatch** - Frontend gọi HTTP nhưng server chỉ support HTTPS

**Giải pháp:**

### Step 1: Kiểm tra file `.env` Backend

Đảm bảo cấu hình CORS chính xác:

```bash
# Trong server/.env, thêm:
FRONTEND_URL=https://legalmb.cloud
CORS_ORIGINS=https://legalmb.cloud,http://localhost:3000,http://localhost:5173
```

### Step 2: Cập nhật `src/config/env.js`

Kiểm tra hàm `getCorsOrigins()` và cập nhật:

```javascript
export const getCorsOrigins = () => {
  const origins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];
  
  // Thêm frontend URL từ env
  if (process.env.FRONTEND_URL && !origins.includes(process.env.FRONTEND_URL)) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  return origins;
};
```

### Step 3: Cập nhật cấu hình CORS trong `src/app.js`

```javascript
app.use(cors({ 
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Step 4: Cập nhật Frontend API Base URL

Kiểm tra file gọi API (ví dụ: `client/src/services/api.js` hoặc `client/src/lib/axios.js`):

```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://legalmb.cloud/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Quan trọng cho CORS
});

export default api;
```

### Step 5: Kiểm tra Endpoint Đăng Nhập

Đảm bảo endpoint `/v1/auth/login` tồn tại trong `server/src/routes/auth.js`:

```javascript
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // ... logic đăng nhập
    res.json({ token: '...', user: {...} });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Đăng nhập thất bại' });
  }
});
```

---

## 📋 Các Bước Deploy Trên Plesk

### 1. **Build Frontend**

```bash
cd client
npm install
npm run build
# Tạo ra folder: client/dist/
```

### 2. **Upload Build Files**

- Upload `server/` folder lên Plesk (các file JS, package.json, .env, etc.)
- Đảm bảo `client/dist/` cũng được upload hoặc tạo trên server

### 3. **Cấu hình Node.js trên Plesk**

- Đặt **Document Root** = `/public` hoặc `/` tùy Plesk
- Đặt **Application Root** = `/server`
- Đặt **Startup File** = `index.js`
- **Node.js version** = 18+

### 4. **Cấu hình Environment Variables**

Trên Plesk, thêm environment variables:

```
APP_PORT=8080
NODE_ENV=production
FRONTEND_URL=https://legalmb.cloud
CORS_ORIGINS=https://legalmb.cloud
DATABASE_URL=...
JWT_SECRET=...
SESSION_SECRET=...
```

### 5. **Install Dependencies & Start**

```bash
cd server
npm install
npm start
```

### 6. **Kiểm Tra Health Check**

```bash
curl https://legalmb.cloud/v1/health
```

---

## 🧪 Debug Steps

### Kiểm Tra Lỗi 500

```bash
# SSH vào server Plesk
ssh user@legalmb.cloud

# Xem error logs
tail -f /var/log/nodejs/app.log
# hoặc
tail -f ~/.pm2/logs/app-error.log

# Kiểm tra port 8080 có listen không
netstat -tlnp | grep 8080
```

### Kiểm Tra CORS Issue

Mở Browser DevTools (F12) → Console, khi đăng nhập xem:
1. Có error CORS không?
2. Response headers có `Access-Control-Allow-Origin` không?
3. API endpoint gọi đến URL nào?

```javascript
// Test API từ browser console
fetch('https://legalmb.cloud/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: '...' }),
  credentials: 'include'
})
.then(r => {
  console.log('Response status:', r.status);
  console.log('Response headers:', r.headers);
  return r.text(); // Lấy raw response
})
.then(console.log)
.catch(console.error);
```

### Kiểm Tra Endpoint Tồn Tại

```bash
curl -X POST https://legalmb.cloud/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Nếu trả HTML thay vì JSON → endpoint không tồn tại hoặc lỗi server
```

---

## ✅ Checklist Trước Deploy

- [ ] Build frontend: `npm run build` → tạo `client/dist/`
- [ ] Kiểm tra `.env` backend có đầy đủ credentials
- [ ] Cập nhật `CORS_ORIGINS` và `FRONTEND_URL` trong `.env`
- [ ] Thêm SPA fallback middleware trong `server/src/app.js`
- [ ] Upload `server/` và `client/dist/` lên Plesk
- [ ] Chạy `npm install` trên server
- [ ] Kiểm tra `/v1/health` endpoint
- [ ] Test đăng nhập từ https://legalmb.cloud/login
- [ ] Kiểm tra Browser Console không có lỗi CORS

---

## 🎯 Nếu Vẫn Lỗi

1. **Lỗi 500 vẫn xảy ra**: Kiểm tra server logs, có thể là lỗi trong middleware hoặc route handler
2. **Vẫn lỗi JSON**: Kiểm tra API base URL trong frontend có đúng không
3. **CORS vẫn block**: Kiểm tra `CORS_ORIGINS` env var, thêm `credentials: true` vào axios/fetch

Cần thêm gì không?
