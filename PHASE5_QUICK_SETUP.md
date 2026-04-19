# Quick Setup - PHASE 5 Dependencies

**Thời gian**: ~5 phút  
**Độ khó**: Dễ  
**Yêu cầu**: Node.js 16+, npm 8+

---

## 🚀 1. Cài đặt Dependencies

```bash
# Vào thư mục client
cd e:\Project\longpl\client

# Cài đặt Redux & State Management
npm install @reduxjs/toolkit react-redux

# Cài đặt HTTP Client
npm install axios

# Cài đặt WebSocket Client
npm install socket.io-client

# Cài đặt Testing Tools
npm install -D \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  @vitest/ui \
  jsdom
```

**Hoặc sử dụng file lệnh này:**

```bash
# Windows
npm install @reduxjs/toolkit react-redux axios socket.io-client && npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui jsdom
```

---

## ✅ 2. Xác Minh Cài Đặt

```bash
# Kiểm tra phiên bản
node --version
npm --version

# Kiểm tra các package đã cài
npm list @reduxjs/toolkit react-redux axios socket.io-client vitest

# Output mong đợi:
# ├── @reduxjs/toolkit@1.9.x
# ├── react-redux@8.1.x
# ├── axios@1.4.x
# ├── socket.io-client@4.6.x
# └── vitest@0.34.x
```

---

## 🧪 3. Chạy Tests

```bash
# Chạy tất cả tests
npm test

# Watch mode (reload khi file thay đổi)
npm test:watch

# UI mode (interactive)
npm test:ui

# Coverage report
npm test:coverage
```

---

## 🎯 4. Start Dev Server

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Kết quả:
# Local:   http://localhost:5173
# Press q to quit
```

---

## 🔍 5. Kiểm Tra Redux DevTools

1. **Cài đặt Extension**
   - Chrome: [Redux DevTools Chrome Extension](https://chromewebstore.google.com/detail/redux-devtools/lmjabopchccccneac387xphgehppmeMe)
   - Firefox: [Redux DevTools Firefox Extension](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)

2. **Xác Minh Kết Nối**
   - Mở DevTools (F12)
   - Click tab "Redux"
   - Phải thấy store state

---

## 📦 6. package.json Scripts

Kiểm tra/cập nhật file `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "react": "^18.2.x",
    "react-dom": "^18.2.x",
    "react-router-dom": "^6.x",
    "react-redux": "^8.1.x",
    "@reduxjs/toolkit": "^1.9.x",
    "axios": "^1.4.x",
    "socket.io-client": "^4.6.x"
  },
  "devDependencies": {
    "vitest": "^0.34.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^5.x",
    "@vitest/ui": "^0.34.x",
    "jsdom": "^22.x"
  }
}
```

---

## 🎮 7. First Test Run

```bash
# Chạy single test
npm test -- authSlice.test.js

# Output mong đợi:
# ✓ src/store/slices/authSlice.test.js (10)
#   ✓ authSlice
#     ✓ setToken
#       ✓ cập nhật token và localStorage
#       ✓ xóa token khi null
#     ✓ setUser
#     ...
# 
# Test Files  3 passed (3)
# Tests      30 passed (30)
```

---

## 🛠️ 8. Configuration Files Check

Kiểm tra các file cấu hình:

```bash
# File cần tồn tại:
ls client/src/store/index.js
ls client/src/store/slices/authSlice.js
ls client/src/store/slices/draftSlice.js
ls client/src/store/slices/uiSlice.js
ls client/src/services/authService.js
ls client/src/services/socketService.js
ls client/src/hooks/useAuth.js
ls client/src/hooks/useSocket.js
ls client/vitest.config.js
ls client/src/test/setup.js
```

---

## 🔗 9. Cấu Hình Environment Variables

**File**: `client/.env.development`

```bash
VITE_API_URL=http://localhost:8080/v1
VITE_SOCKET_URL=http://localhost:8080
VITE_APP_NAME=LegalReview Dev
```

**File**: `client/.env.production`

```bash
VITE_API_URL=https://api.yourdomain.com/v1
VITE_SOCKET_URL=https://yourdomain.com
VITE_APP_NAME=LegalReview
```

---

## ⚡ 10. Troubleshooting

### Error: "Cannot find module '@reduxjs/toolkit'"

```bash
# Solution
rm -rf node_modules package-lock.json
npm install

# Hoặc Windows:
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Error: "vitest not found"

```bash
# Kiểm tra cài đặt
npm list vitest

# Cài lại nếu cần
npm install -D vitest
```

### Error: "CORS error"

```bash
# Kiểm tra server CORS config
# trong server/src/app.js hoặc server/index.js:

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
```

### Redux DevTools không hoạt động

```bash
# Kiểm tra store configuration
# client/src/store/index.js phải có:

const store = configureStore({
  reducer: { ... },
  devTools: import.meta.env.MODE !== 'production',
});
```

---

## 📊 Expected Output

Sau khi cài đặt thành công:

```
✓ npm install completed
✓ 152 packages installed
✓ No vulnerabilities

npm run test
✓ authSlice.test.js (5 tests) ✓
✓ draftSlice.test.js (8 tests) ✓
✓ authService.test.js (6 tests) ✓
✓ uiSlice.test.js (coming soon)

Test Files  3 passed (3)
Tests      19 passed (19)
```

---

## 🎉 Success Criteria

✅ Tất cả packages cài đặt thành công  
✅ `npm test` chạy không lỗi  
✅ Redux DevTools hoạt động  
✅ Dev server chạy http://localhost:5173  
✅ Không có console errors  
✅ Tests pass 100%  

---

## 📚 Next Steps

1. Chạy tests: `npm test:ui`
2. Start dev server: `npm run dev`
3. Mở Redux DevTools
4. Thử authentication flow
5. Check WebSocket connection

---

**Thời gian**: ~5-10 phút  
**Status**: 🚀 Ready to code!

**Cần giúp?** → Xem [PHASE5_INTEGRATION_GUIDE_VN.md](./PHASE5_INTEGRATION_GUIDE_VN.md)
