# Hướng dẫn Tích hợp PHASE 5

**Ngày**: 18 Tháng 4, 2026  
**Status**: 🚀 Đang thực hiện  
**Độ phức tạp**: Trung bình

---

## 📋 Checklist Tích hợp

### ✅ P5.1: Redux Setup

- [x] Tạo Redux store configuration
- [x] Tạo Auth slice  
- [x] Tạo Draft slice
- [x] Tạo UI slice
- [ ] Update `client/src/main.jsx` với Provider
- [ ] Test Redux DevTools

### ✅ P5.2: Services & Hooks

- [x] Tạo `authService.js`
- [x] Tạo `socketService.js`
- [x] Tạo `useAuth.js` hook
- [x] Tạo `useSocket.js` hook
- [ ] Update `App.jsx` để sử dụng Redux
- [ ] Test auth flow

### ✅ P5.3: Testing Setup

- [x] Tạo `vitest.config.js`
- [x] Tạo `src/test/setup.js`
- [ ] Cài đặt testing dependencies
- [ ] Viết test cho authService
- [ ] Viết test cho Redux slices

---

## 🎯 Bước 1: Cập nhật main.jsx

**File**: `client/src/main.jsx`

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import store from './store'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)
```

### Cài đặt cần thiết

```bash
cd client

# Cài đặt Redux
npm install @reduxjs/toolkit react-redux

# Cài đặt axios
npm install axios

# Cài đặt Socket.io
npm install socket.io-client

# Cài đặt testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui
```

---

## 🎯 Bước 2: Test Redux Store

**File**: `client/src/store/__tests__/authSlice.test.js`

```javascript
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  setToken,
  setUser,
  clearAuth,
} from '../slices/authSlice';

describe('authSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: { auth: authReducer },
    });
    localStorage.clear();
  });

  test('setToken - lưu token vào state và localStorage', () => {
    const testToken = 'test-token-xyz';
    store.dispatch(setToken(testToken));

    const state = store.getState().auth;
    expect(state.token).toBe(testToken);
    expect(state.isAuthenticated).toBe(true);
    expect(localStorage.getItem('auth_token')).toBe(testToken);
  });

  test('setUser - lưu user vào state', () => {
    const testUser = { id: 1, name: 'John', email: 'john@example.com' };
    store.dispatch(setUser(testUser));

    const state = store.getState().auth;
    expect(state.user).toEqual(testUser);
    expect(state.isAuthenticated).toBe(true);
  });

  test('clearAuth - xóa tất cả auth data', () => {
    store.dispatch(setToken('test-token'));
    store.dispatch(setUser({ id: 1, name: 'John' }));

    store.dispatch(clearAuth());

    const state = store.getState().auth;
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
```

---

## 🎯 Bước 3: Test authService

**File**: `client/src/services/__tests__/authService.test.js`

```javascript
import authService from '../authService';

describe('authService', () => {
  describe('isTokenValid', () => {
    test('trả về false nếu token không tồn tại', () => {
      expect(authService.isTokenValid(null)).toBe(false);
      expect(authService.isTokenValid('')).toBe(false);
    });

    test('trả về false nếu token không hợp lệ', () => {
      expect(authService.isTokenValid('invalid-token')).toBe(false);
      expect(authService.isTokenValid('a.b')).toBe(false);
    });

    test('trả về false nếu token hết hạn', () => {
      // Token với exp time trong quá khứ
      const expiredPayload = btoa(JSON.stringify({
        sub: 1,
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 giờ trước
      }));
      const expiredToken = `header.${expiredPayload}.signature`;

      expect(authService.isTokenValid(expiredToken)).toBe(false);
    });

    test('trả về true nếu token hợp lệ và còn hạn', () => {
      // Token với exp time trong tương lai
      const validPayload = btoa(JSON.stringify({
        sub: 1,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 giờ sau
      }));
      const validToken = `header.${validPayload}.signature`;

      expect(authService.isTokenValid(validToken)).toBe(true);
    });
  });

  describe('decodeToken', () => {
    test('decode JWT token thành công', () => {
      const payload = btoa(JSON.stringify({
        sub: 1,
        name: 'John',
        email: 'john@example.com',
      }));
      const token = `header.${payload}.signature`;

      const decoded = authService.decodeToken(token);
      expect(decoded.sub).toBe(1);
      expect(decoded.name).toBe('John');
      expect(decoded.email).toBe('john@example.com');
    });

    test('trả về null nếu decode thất bại', () => {
      expect(authService.decodeToken('invalid')).toBeNull();
    });
  });
});
```

---

## 🎯 Bước 4: Chạy Tests

```bash
cd client

# Chạy tất cả tests
npm run test

# Watch mode
npm run test:watch

# UI mode (tương tác)
npm run test:ui

# Coverage report
npm run test:coverage
```

### Update package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --ext .js,.jsx"
  }
}
```

---

## 🎯 Bước 5: Tích hợp Redux vào App.jsx

Thêm Redux Provider vào App hoặc main.jsx:

```javascript
// Sử dụng Redux selectors thay vì local state
import { useSelector, useDispatch } from 'react-redux';
import { setToken, setUser } from './store/slices/authSlice';
import authService from './services/authService';

function App() {
  const dispatch = useDispatch();
  const { token, user, isAuthenticated } = useSelector(state => state.auth);

  useEffect(() => {
    // Load auth từ token
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken && authService.isTokenValid(savedToken)) {
      // Load user profile
      authService.getCurrentUser(savedToken)
        .then(userData => {
          dispatch(setUser(userData));
          dispatch(setToken(savedToken));
        })
        .catch(error => console.error('Load user failed:', error));
    }
  }, [dispatch]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    // Rest of app
  );
}
```

---

## 🎯 Bước 6: WebSocket Integration

```javascript
// Sử dụng useSocket hook
import useSocket from './hooks/useSocket';

function DraftDetail() {
  const socket = useSocket({ 
    autoConnect: true,
    onConnect: () => console.log('Socket connected'),
  });

  useEffect(() => {
    // Join draft room
    socket.joinRoom('draft:123');

    // Listen for updates
    socket.on('draft:updated', (draft) => {
      console.log('Draft updated:', draft);
    });

    return () => {
      socket.leaveRoom('draft:123');
    };
  }, [socket]);

  return (
    // Component
  );
}
```

---

## 🎯 Bước 7: Environment Variables

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

## ⚠️ Common Issues & Solutions

### Issue 1: Redux DevTools Extension lỗi

```javascript
// Fix trong store/index.js
const store = configureStore({
  reducer: { ... },
  devTools: import.meta.env.MODE !== 'production',
});
```

### Issue 2: Socket.io Connection Failed

```javascript
// Kiểm tra CORS trong server
// server/src/app.js
io(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});
```

### Issue 3: Token Refresh Loop

```javascript
// Thêm retry logic trong authService
const refreshToken = async (token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.data.data.token;
  } catch (error) {
    // Clear auth if refresh fails
    localStorage.removeItem('auth_token');
    throw error;
  }
};
```

---

## 📊 Success Metrics

✅ Redux store hoạt động  
✅ Auth flow đầy đủ  
✅ Tests pass 100%  
✅ Socket.io connected  
✅ Token refresh automatic  
✅ Bundle size < 500KB

---

## 🔗 Related Files

- [PHASE5_PLAN_DETAIL_VN.md](./PHASE5_PLAN_DETAIL_VN.md) - Kế hoạch chi tiết
- [Code Structure](./docs/ARCHITECTURE_V2.md) - Kiến trúc
- [Database Schema](./docs/DATABASE.md) - Database

---

**Tiếp theo**: P5.4 - Tối ưu hóa & Performance Testing
