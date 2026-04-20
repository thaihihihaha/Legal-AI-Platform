# ⚡ Quick Reference - Xử Lý Lỗi Plesk (legalmb.cloud)

## 🎯 Tóm Tắt Vấn Đề & Giải Pháp

| Vấn đề | Nguyên Nhân | Giải Pháp |
|--------|-----------|----------|
| **F5 tại /login → 500** | Express không biết tất cả routes là SPA | Thêm SPA fallback route serve index.html |
| **Lỗi JSON "<!doctype"** | CORS block + endpoint trả HTML | Enable CORS credentials + cấu hình API URL |

---

## 📦 Files Đã Thay Đổi

```
✅ server/src/app.js
✅ server/src/config/env.js
✅ server/.env
✅ client/src/services/apiClient.js
✅ client/.env.production (NEW)
```

---

## 🚀 Deploy Steps

### 1️⃣ Build Frontend
```bash
cd client
npm run build  # → client/dist/
cd ..
```

### 2️⃣ Upload to Plesk
- Upload `server/` folder
- Copy `client/dist/` → `server/client/dist/`

### 3️⃣ Configure in Plesk
```
Document Root: /
Application Root: server
Startup File: index.js
Node.js: 18.x+
```

### 4️⃣ Set Environment Variables
```
FRONTEND_URL=https://legalmb.cloud
CORS_ORIGINS=https://legalmb.cloud
DATABASE_URL=<your-db>
JWT_SECRET=<secure>
SESSION_SECRET=<secure>
```

### 5️⃣ Start & Test
```bash
npm install
npm start

# Test
curl https://legalmb.cloud/v1/health
```

---

## ✅ Testing

- [ ] `https://legalmb.cloud/` → Login page (không 500)
- [ ] F5 tại `/login` → OK (không 500)
- [ ] Đăng nhập → JSON response (không "<!doctype")
- [ ] Dashboard loads → Các endpoint hoạt động

---

## 🔧 Debug Commands

```bash
# Check health
curl https://legalmb.cloud/v1/health

# Check CORS
curl -i -X OPTIONS https://legalmb.cloud/v1/auth/login \
  -H "Origin: https://legalmb.cloud"

# Test login
curl -X POST https://legalmb.cloud/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# View logs
ssh user@legalmb.cloud
tail -f ~/.pm2/logs/app-error.log
```

---

## 📖 Full Guides

- **Detailed Fix Guide:** [PLESK_DEPLOYMENT_FIX.md](PLESK_DEPLOYMENT_FIX.md)
- **Debug Checklist:** [PLESK_DEBUG_CHECKLIST.md](PLESK_DEBUG_CHECKLIST.md)
- **Fixes Summary:** [PLESK_DEPLOYMENT_FIXES.md](PLESK_DEPLOYMENT_FIXES.md)

---

## 🎯 Key Changes Explained

### 1. SPA Fallback Route (Fix Vấn đề 1)
```javascript
// server/src/app.js
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});
```
- Tất cả `/login`, `/contracts`, etc. serve `index.html`
- React Router xử lý routing trên frontend

### 2. CORS + Static Files (Fix Vấn đề 2)
```javascript
// CORS allow credentials
app.use(cors({ 
  origin: getCorsOrigins(),
  credentials: true
}));

// Serve frontend build
app.use(express.static(frontendDistPath));
```

### 3. Production API URL
```bash
# client/.env.production
VITE_API_URL=https://legalmb.cloud/v1
```

---

## ⚠️ Common Mistakes

1. ❌ Quên build frontend (`npm run build`)
   - ✅ Phải có `client/dist/` trên server

2. ❌ Quên upload `client/dist/`
   - ✅ Upload hoặc copy vào server

3. ❌ CORS_ORIGINS không có production domain
   - ✅ Đặt `CORS_ORIGINS=https://legalmb.cloud`

4. ❌ Frontend env var sai
   - ✅ `.env.production` phải có `VITE_API_URL=https://legalmb.cloud/v1`

---

**Need Help?** Check [PLESK_DEBUG_CHECKLIST.md](PLESK_DEBUG_CHECKLIST.md) 🆘
