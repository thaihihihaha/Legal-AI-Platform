# Plesk Deployment - Fixes Applied

## 📋 Tóm Tắt Các Fix

### ✅ Đã Fix Vấn đề 1: F5 Reload → Lỗi 500

**Thay đổi trong `server/src/app.js`:**
1. Thêm imports: `import path from 'path'` và `import { fileURLToPath } from 'url'`
2. Serve static files từ `client/dist/`
3. Thêm **SPA fallback route** - rất quan trọng!
   - Tất cả requests không match `/v1/*` và `/uploads/*` đều serve `index.html`
   - Cho phép React Router xử lý routing trên client

**Lý do:** Khi F5 tại `/login`, Express sẽ serve `index.html` thay vì cố tìm endpoint `/login` không tồn tại

---

### ✅ Đã Fix Vấn đề 2: Lỗi JSON "<!doctype"

**Thay đổi:**

1. **server/src/config/env.js:**
   - Cập nhật `getCorsOrigins()` để hỗ trợ `CORS_ORIGINS` env var
   - Default values: `http://localhost:3000`, `http://localhost:5173`

2. **server/src/app.js:**
   - Cập nhật CORS config:
     ```javascript
     app.use(cors({ 
       origin: getCorsOrigins(),
       credentials: true,  // ← Quan trọng
       methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
       allowedHeaders: ['Content-Type', 'Authorization']
     }));
     ```

3. **server/.env:**
   - Thêm `FRONTEND_URL=https://legalmb.cloud`
   - Thêm `CORS_ORIGINS=https://legalmb.cloud,http://localhost:3000,http://localhost:5173`

4. **client/src/services/apiClient.js:**
   - Thêm `withCredentials: true` để hỗ trợ CORS credentials

5. **client/.env.production (new file):**
   - `VITE_API_URL=https://legalmb.cloud/v1` - để build sử dụng production API URL

**Lý do:** Lỗi "<!doctype" xảy ra vì:
- Endpoint `/v1/auth/login` trả về HTML (error page) thay vì JSON
- CORS bị block nên Express trả error page HTML
- Frontend gọi sai API URL

---

## 📝 Files Thay Đổi

```
server/
├── src/
│   ├── app.js              ← Thêm static files serving + SPA fallback
│   └── config/env.js       ← Cập nhật CORS origins config
└── .env                    ← Thêm FRONTEND_URL + CORS_ORIGINS

client/
├── src/
│   └── services/
│       └── apiClient.js    ← Thêm withCredentials: true
└── .env.production         ← NEW FILE: VITE_API_URL=https://legalmb.cloud/v1
```

---

## 🚀 Cách Deploy

### Step 1: Build Frontend
```bash
cd client
npm install
npm run build  # Tạo client/dist/
cd ..
```

### Step 2: Upload Files
- Upload `server/` folder lên Plesk (hoặc git push)
- Đảm bảo `client/dist/` cũng được upload

### Step 3: Cấu hình Node.js trong Plesk
- **Document Root:** `/`
- **Application Root:** `server`
- **Startup File:** `index.js`
- **Node.js version:** 18.x hoặc cao hơn
- **Environment Variables:**
  ```
  FRONTEND_URL=https://legalmb.cloud
  CORS_ORIGINS=https://legalmb.cloud
  DATABASE_URL=postgresql://...
  JWT_SECRET=...
  SESSION_SECRET=...
  ```

### Step 4: Start Node.js
```bash
npm install
npm start
```

### Step 5: Test
```bash
# Health check
curl https://legalmb.cloud/v1/health

# Frontend
curl https://legalmb.cloud/
curl https://legalmb.cloud/login

# API test
curl -X POST https://legalmb.cloud/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

---

## 🧪 Testing Checklist

- [ ] Truy cập `https://legalmb.cloud/` → Thấy login page
- [ ] F5 tại `https://legalmb.cloud/login` → Không lỗi 500
- [ ] F5 tại `https://legalmb.cloud/contracts` → Không lỗi 500
- [ ] Đăng nhập → Response là JSON (không phải HTML)
- [ ] Sau đăng nhập → Vào được dashboard
- [ ] Check browser console → Không có CORS errors
- [ ] Check Network tab → Tất cả API calls status 200/201/400 (JSON)

---

## 📞 Nếu Vẫn Có Lỗi

Xem: [PLESK_DEBUG_CHECKLIST.md](PLESK_DEBUG_CHECKLIST.md)

Hoặc chạy:
```bash
# SSH vào server
tail -f ~/.pm2/logs/app-error.log
```

---

## ✨ Key Points

1. **SPA Fallback Route** - tất cả `/login`, `/contracts`, `/documents` etc. đều serve `index.html`, React Router xử lý
2. **CORS Credentials** - `credentials: true` + `withCredentials: true` cho phép cross-origin requests
3. **Production API URL** - `.env.production` file đảm bảo frontend build sử dụng đúng API endpoint
4. **Static Files Serving** - Express phục vụ `client/dist/` content trước khi check API routes

Hoàn tất! 🎉
