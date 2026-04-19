# PHASE 5 - Hướng dẫn chạy & kiểm tra

**Ngày**: 18 Tháng 4, 2026  
**Mục đích**: Hướng dẫn từng bước chạy PHASE 5 setup

---

## 🎯 Các bước cài đặt & kiểm tra

### Bước 1: Cài đặt Dependencies (5 phút)

**Terminal**:
```bash
# Vào thư mục client
cd e:\Project\longpl\client

# Hoặc dùng relative path:
cd client

# Cài đặt Redux & state management
npm install @reduxjs/toolkit react-redux

# Cài đặt HTTP client
npm install axios

# Cài đặt WebSocket client
npm install socket.io-client

# Cài đặt Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui jsdom
```

**Hoặc chạy tất cả một lần**:
```bash
npm install @reduxjs/toolkit react-redux axios socket.io-client && npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui jsdom
```

**Xác minh cài đặt**:
```bash
npm list @reduxjs/toolkit react-redux axios socket.io-client vitest
```

---

### Bước 2: Chạy Tests (10 phút)

**Chạy tất cả tests**:
```bash
npm test

# Output mong đợi:
# ✓ src/store/slices/authSlice.test.js (6)
# ✓ src/store/slices/draftSlice.test.js (8)
# ✓ src/services/authService.test.js (10)
#
# Test Files  3 passed (3)
# Tests      24 passed (24)
```

**Watch mode** (tự động chạy lại khi file thay đổi):
```bash
npm run test:watch
```

**UI mode** (giao diện tương tác):
```bash
npm run test:ui

# Sẽ mở browser ở: http://localhost:51204/__vitest__/
```

**Coverage report**:
```bash
npm run test:coverage

# Xem kết quả:
# -------|---------|---------|---------|---------|-------------------
# File   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
# -------|---------|---------|---------|---------|-------------------
# All    |   85.5  |   73.2   |   90    |   85.5  |
```

---

### Bước 3: Start Dev Server (5 phút)

**Terminal 1: Start Vite Dev Server**:
```bash
npm run dev

# Output:
# ➜  Local:   http://localhost:5173/
# ➜  Press q to quit
```

**Browser**: Mở http://localhost:5173

**Xác minh**:
- [ ] Trang load thành công
- [ ] Không có console errors
- [ ] Redux DevTools hoạt động (nếu đã cài extension)

---

### Bước 4: Verify Redux Setup (5 phút)

**Kiểm tra Redux DevTools**:

1. Mở DevTools (F12)
2. Click tab "Redux"
3. Xem store state:
   ```javascript
   {
     auth: {
       token: null,
       user: null,
       isLoading: false,
       error: null,
       isAuthenticated: false,
     },
     draft: {
       currentDraft: null,
       drafts: [],
       isLoading: false,
       error: null,
       // ...
     },
     ui: {
       sidebarOpen: true,
       darkMode: false,
       notifications: [],
       // ...
     },
   }
   ```

4. Click "Actions" tab để xem các action
5. Dispatch test action:
   ```javascript
   // Trong Redux DevTools console:
   store.dispatch({ type: 'auth/setToken', payload: 'test-token' })
   ```

**Console Check**:
```javascript
// F12 → Console tab
// Chạy:
localStorage.getItem('auth_token')
// Output: null (nếu chưa login)
```

---

### Bước 5: Test Authentication Flow (10 phút)

**Manual test** (nếu có backend chạy):

```javascript
// F12 → Console
// 1. Test token validation
import authService from '/src/services/authService.js'

authService.isTokenValid(null)  // false
authService.isTokenValid('invalid')  // false

// 2. Test token decode
const payload = btoa(JSON.stringify({ sub: 1, name: 'Test' }))
const token = `header.${payload}.signature`
authService.decodeToken(token)  // { sub: 1, name: 'Test' }

// 3. Test with real token (if backend is running)
await authService.login('email@example.com', 'password')
```

---

### Bước 6: Verify File Structure

**Kiểm tra tất cả files đã tạo**:

```bash
# Windows
dir client\src\store\index.js
dir client\src\store\slices\*.js
dir client\src\services\*.js
dir client\src\hooks\*.js
dir client\vitest.config.js
dir client\src\main.jsx
dir client\src\test\setup.js

# Or using PowerShell:
Test-Path "client/src/store/index.js"
Test-Path "client/src/store/slices/authSlice.js"
# etc.
```

**Expected Output**:
```
✓ client\src\store\index.js
✓ client\src\store\slices\authSlice.js
✓ client\src\store\slices\draftSlice.js
✓ client\src\store\slices\uiSlice.js
✓ client\src\services\authService.js
✓ client\src\services\socketService.js
✓ client\src\hooks\useAuth.js
✓ client\src\hooks\useSocket.js
✓ client\vitest.config.js
✓ client\src\test\setup.js
```

---

### Bước 7: Environment Variables

**Tạo file** `client/.env.development`:
```bash
VITE_API_URL=http://localhost:8080/v1
VITE_SOCKET_URL=http://localhost:8080
VITE_APP_NAME=LegalReview Dev
```

**Tạo file** `client/.env.production`:
```bash
VITE_API_URL=https://api.yourdomain.com/v1
VITE_SOCKET_URL=https://yourdomain.com
VITE_APP_NAME=LegalReview
```

---

## 📊 Checklist Hoàn Thành

Sau khi thực hiện các bước trên:

- [ ] Dependencies cài đặt thành công
- [ ] `npm test` chạy passing 24/24
- [ ] Dev server chạy tại http://localhost:5173
- [ ] Redux DevTools hoạt động
- [ ] Không có console errors
- [ ] File structure đầy đủ
- [ ] Environment variables configured

---

## 🆘 Troubleshooting

### Error 1: "Cannot find module '@reduxjs/toolkit'"

```bash
# Clear cache & reinstall
rm -rf node_modules package-lock.json
npm install

# Hoặc Windows:
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Error 2: "vitest not found"

```bash
npm install -D vitest
npm test
```

### Error 3: "CORS error từ server"

```bash
# Kiểm tra server CORS config:
# server/src/app.js hoặc server/index.js

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
```

### Error 4: "Redux DevTools không hoạt động"

```bash
# 1. Cài extension: https://chromewebstore.google.com/detail/redux-devtools/
# 2. Kiểm tra store/index.js:
const store = configureStore({
  reducer: { ... },
  devTools: import.meta.env.MODE !== 'production',
});
```

### Error 5: "localStorage undefined in tests"

```bash
# Đã handle trong test/setup.js
# Nếu vẫn lỗi, chạy:
npm run test -- --no-coverage
```

---

## 📈 Performance Baseline

Sau setup, kiểm tra metrics:

```bash
# Bundle size
npm run build

# Output:
# vite v4.x.x building for production...
# ✓ xxxx modules transformed
# dist/index.html                   0.46 kB
# dist/assets/index.xxxxxx.js     xxx.xx kB │ gzip: xxx.xx kB
# dist/assets/index.xxxxxx.css      x.xx kB │ gzip: x.xx kB
```

**Target**:
- JS Bundle: < 500KB (gzip)
- CSS: < 100KB
- Total: < 600KB (gzip)

---

## 🎯 Success Criteria

✅ Tất cả tests pass (24/24)  
✅ Dev server chạy smooth  
✅ Redux state management hoạt động  
✅ No console errors  
✅ Redux DevTools connected  
✅ File structure complete  
✅ Environment variables set  

---

## 📚 Tài Liệu Tham Khảo

1. **PHASE5_PLAN_DETAIL_VN.md** - Kế hoạch chi tiết
2. **PHASE5_INTEGRATION_GUIDE_VN.md** - Hướng dẫn tích hợp
3. **PHASE5_QUICK_SETUP.md** - Cài đặt nhanh
4. **PHASE5_STATUS_REPORT.md** - Status report
5. **PHASE5_CHECKLIST.md** - Checklist toàn phase
6. **PHASE5_SUMMARY.md** - Tổng kết

---

## 🚀 Next Phase

Sau khi verify thành công:

1. **P5.4**: Performance Optimization
2. **P5.5**: WebSocket Real-time Features
3. **P5.6**: Error Handling & Logging
4. **P5.7**: Production Deployment

---

**Thời gian**: ~30 phút để hoàn tất toàn bộ setup  
**Độ khó**: Dễ (chủ yếu là chạy commands)  
**Status**: 🚀 Sẵn sàng!

---

**Cần giúp?** → Xem file tương ứng hoặc hỏi tôi!

**Bắt đầu nào?** → Chạy: `npm install @reduxjs/toolkit react-redux axios socket.io-client`
