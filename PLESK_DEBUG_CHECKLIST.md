# Plesk Deployment Debug Checklist

## ✅ Trước Deploy

### 1. Build Frontend
```bash
cd client
npm install
npm run build  # Tạo client/dist/
```
**Kiểm tra:**
- [ ] Folder `client/dist/` có tồn tại?
- [ ] File `client/dist/index.html` có tồn tại?
- [ ] Folder `client/dist/assets/` có nhiều file JS/CSS?

### 2. Kiểm tra Backend Config
```bash
cd server
cat .env | grep -E "FRONTEND_URL|CORS_ORIGINS"
```
**Kiểm tra:**
- [ ] `FRONTEND_URL=https://legalmb.cloud`?
- [ ] `CORS_ORIGINS=https://legalmb.cloud,...`?

### 3. Kiểm tra Frontend Config
```bash
cat client/.env.production
```
**Kiểm tra:**
- [ ] `VITE_API_URL=https://legalmb.cloud/v1`?

---

## 🔍 Debug Sau Deploy

### Vấn đề 1: F5 lỗi 500 tại /login

#### Debug bước 1: Kiểm tra server logs
```bash
# SSH vào Plesk
ssh user@legalmb.cloud

# Xem Node.js logs
tail -f ~/.pm2/logs/app-error.log
# hoặc
tail -f /var/log/nodejs/app.log
# hoặc (nếu dùng Plesk Node.js)
journalctl -u application.name -n 50
```

#### Debug bước 2: Kiểm tra health endpoint
```bash
curl -i https://legalmb.cloud/v1/health
```
**Output mong đợi:**
```
HTTP/2 200
{
  "status": "ok",
  "message": "Backend NodeJS đã hoạt động ổn định.",
  "checks": {...}
}
```

**Nếu 500:** Kiểm tra server logs ở bước 1

#### Debug bước 3: Test fetch index.html
```bash
curl -i https://legalmb.cloud/
```
**Output mong đợi:**
```
HTTP/2 200
Content-Type: text/html
<!DOCTYPE html>
<html>...
```

**Nếu 404 hoặc không phải HTML:** 
- Kiểm tra `client/dist/` có tồn tại trên server?
- Kiểm tra path `frontendDistPath` trong `server/src/app.js` có đúng?

#### Debug bước 4: Test login page
```bash
curl -i https://legalmb.cloud/login
```
**Output mong đợi:** HTML (index.html)

**Nếu 500:**
- Kiểm tra middleware SPA fallback trong app.js có tồn tại?
- Kiểm tra `frontendDistPath` path có trỏ đúng?

---

### Vấn đề 2: Lỗi JSON "<!doctype" khi đăng nhập

#### Debug bước 1: Kiểm tra CORS headers
Mở Browser → F12 → Network tab → Gửi login request

**Kiểm tra response headers có:**
- [ ] `Access-Control-Allow-Origin: https://legalmb.cloud`?
- [ ] `Access-Control-Allow-Credentials: true`?
- [ ] `Content-Type: application/json`?

**Nếu không:**
- Kiểm tra `CORS_ORIGINS` env var có chứa `https://legalmb.cloud`?
- Kiểm tra `app.js` có `credentials: true` trong CORS config?

#### Debug bước 2: Test login endpoint trực tiếp
```bash
curl -X POST https://legalmb.cloud/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

**Output mong đợi:**
```json
{
  "error": "Đăng nhập thất bại",
  "message": "..."
}
```
hoặc
```json
{
  "data": {
    "token": "...",
    "user": {...}
  }
}
```

**Nếu nhận HTML (<!DOCTYPE):**
- Endpoint `/v1/auth/login` không tồn tại
- Express fallback serve index.html
- Kiểm tra route auth có được mount đúng?

#### Debug bước 3: Kiểm tra API URL trong Frontend
Mở Browser Console (F12) → Console tab:
```javascript
// Check API URL
console.log(import.meta.env.VITE_API_URL);

// Test fetch
fetch('https://legalmb.cloud/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'test123' }),
  credentials: 'include'
})
.then(r => {
  console.log('Status:', r.status);
  console.log('Headers:', {
    'content-type': r.headers.get('content-type'),
    'cors': r.headers.get('access-control-allow-origin')
  });
  return r.text();
})
.then(text => {
  console.log('Response:', text.substring(0, 100));
})
.catch(console.error);
```

#### Debug bước 4: Kiểm tra Network tab
Browser F12 → Network tab → Gửi login request

**Kiểm tra:**
- [ ] Request gửi đến URL nào? (phải là `https://legalmb.cloud/v1/auth/login`)
- [ ] Status code là gì? (200/400/401/500?)
- [ ] Response Content-Type là gì? (application/json hay text/html?)
- [ ] Response preview có JSON hay HTML?

---

## 🛠️ Common Fixes

### Lỗi 1: Path `frontendDistPath` sai

**Triệu chứng:** 404 khi truy cập `/login`

**Fix:**
```javascript
// server/src/app.js
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDistPath = path.join(__dirname, '../../client/dist');

// Kiểm tra path (thêm console log tạm thời)
console.log('Frontend dist path:', frontendDistPath);
console.log('Path exists:', require('fs').existsSync(frontendDistPath));
```

### Lỗi 2: CORS không được enable

**Triệu chứng:** Lỗi CORS trong browser console

**Fix:**
```javascript
// server/src/app.js
app.use(cors({ 
  origin: getCorsOrigins(),
  credentials: true,  // MUST have this
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Lỗi 3: Frontend gọi API URL sai

**Triệu chứng:** Fetch thành công nhưng nhận HTML

**Fix:**
```bash
# client/.env.production
VITE_API_URL=https://legalmb.cloud/v1
```

**Kiểm tra:**
```javascript
// browser console
console.log(import.meta.env.VITE_API_URL); // phải là https://legalmb.cloud/v1
```

### Lỗi 4: Quên thêm SPA fallback route

**Triệu chứng:** F5 tại `/login` → 500 error

**Fix:** Kiểm tra `server/src/app.js` có đoạn này không:
```javascript
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});
```

---

## 📞 Nếu Vẫn Không Được

1. **Gửi error log từ server:** `tail -50 ~/.pm2/logs/app-error.log`
2. **Gửi browser console error:** F12 → Console tab → Screenshot
3. **Gửi network trace:** F12 → Network tab → Take HAR snapshot
4. **Gửi request/response curl:**
   ```bash
   curl -v https://legalmb.cloud/v1/auth/login -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test123"}' 2>&1 | head -50
   ```
