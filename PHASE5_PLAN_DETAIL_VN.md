# PHASE 5: Tích hợp & Tối ưu - Kế hoạch chi tiết

**Dự án**: Hệ thống LegalReview - Quản lý Tài liệu Pháp lý
**Phase**: PHASE 5 - Tích hợp & Tối ưu hóa
**Trạng thái**: 🚀 Sắp bắt đầu
**Ngày**: 18 Tháng 4, 2026

---

## 📋 Tổng quan PHASE 5

Mục tiêu của PHASE 5 là tích hợp tất cả các component PHASE 4 vào ứng dụng chính và tối ưu hóa toàn bộ hệ thống cho production.

### 7 Công việc chính

**P5.1**: Tích hợp PHASE 4 vào App.jsx chính  
**P5.2**: Thiết lập Redux/Context cho quản lý trạng thái  
**P5.3**: Triển khai persistence session  
**P5.4**: WebSocket cho real-time (tùy chọn)  
**P5.5**: Tối ưu hóa hiệu suất  
**P5.6**: Thiết lập test tự động  
**P5.7**: Prepare cho production deployment  

---

## P5.1: Tích hợp PHASE 4 vào App.jsx

### Bước 1: Update App.jsx chính

**File**: `client/src/App.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Phase4Dashboard } from './components/phase4/Phase4Dashboard';
import LoginPage from './pages/LoginPage';
import NotFound from './pages/NotFound';

function App() {
  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('auth_token') || null;
  });
  
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDraft, setCurrentDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load user từ token khi App mount
  useEffect(() => {
    if (authToken) {
      loadUserProfile();
    }
  }, [authToken]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 401) {
        // Token hết hạn, clear và back to login
        localStorage.removeItem('auth_token');
        setAuthToken(null);
        setCurrentUser(null);
        return;
      }

      const data = await response.json();
      if (data.data) {
        setCurrentUser(data.data);
      }
    } catch (error) {
      console.error('Lỗi load user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (token) => {
    localStorage.setItem('auth_token', token);
    setAuthToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentDraft(null);
  };

  if (!authToken) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-4">Không thể tải thông tin người dùng</p>
          <button
            onClick={() => handleLogout()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* PHASE 4 Dashboard */}
        <Route
          path="/dashboard/*"
          element={
            <Phase4Dashboard
              draftId={currentDraft?.id || 'default-draft'}
              userId={currentUser.id}
              companyId={currentUser.company_id}
              token={authToken}
              onDraftChange={setCurrentDraft}
            />
          }
        />

        {/* Logout route */}
        <Route
          path="/logout"
          element={<LogoutComponent onLogout={handleLogout} />}
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

/**
 * Component xử lý logout
 */
function LogoutComponent({ onLogout }) {
  useEffect(() => {
    onLogout();
  }, [onLogout]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Đang đăng xuất...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
}

export default App;
```

---

## P5.2: Thiết lập Redux cho State Management

### Bước 1: Cài đặt Redux Toolkit

```bash
cd client
npm install @reduxjs/toolkit react-redux
```

### Bước 2: Tạo Redux Store

**File**: `client/src/store/index.js`

```javascript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import draftReducer from './slices/draftSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    draft: draftReducer,
    ui: uiReducer,
  },
});

export default store;
```

### Bước 3: Tạo Auth Slice

**File**: `client/src/store/slices/authSlice.js`

```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  token: localStorage.getItem('auth_token'),
  user: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action) {
      state.token = action.payload;
      localStorage.setItem('auth_token', action.payload);
    },
    setUser(state, action) {
      state.user = action.payload;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    clearAuth(state) {
      state.token = null;
      state.user = null;
      state.error = null;
      localStorage.removeItem('auth_token');
    },
  },
});

export const {
  setToken,
  setUser,
  setLoading,
  setError,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;
```

### Bước 4: Tạo Draft Slice

**File**: `client/src/store/slices/draftSlice.js`

```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentDraft: null,
  drafts: [],
  isLoading: false,
  error: null,
};

const draftSlice = createSlice({
  name: 'draft',
  initialState,
  reducers: {
    setCurrentDraft(state, action) {
      state.currentDraft = action.payload;
    },
    setDrafts(state, action) {
      state.drafts = action.payload;
    },
    addDraft(state, action) {
      state.drafts.push(action.payload);
    },
    updateDraft(state, action) {
      const index = state.drafts.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.drafts[index] = action.payload;
      }
    },
    deleteDraft(state, action) {
      state.drafts = state.drafts.filter(d => d.id !== action.payload);
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const {
  setCurrentDraft,
  setDrafts,
  addDraft,
  updateDraft,
  deleteDraft,
  setLoading,
  setError,
} = draftSlice.actions;

export default draftSlice.reducer;
```

### Bước 5: Tạo UI Slice

**File**: `client/src/store/slices/uiSlice.js`

```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: true,
  darkMode: false,
  notifications: [],
  unreadCount: 0,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
    },
    addNotification(state, action) {
      state.notifications.push(action.payload);
      state.unreadCount += 1;
    },
    clearNotifications(state) {
      state.notifications = [];
      state.unreadCount = 0;
    },
    setUnreadCount(state, action) {
      state.unreadCount = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleDarkMode,
  addNotification,
  clearNotifications,
  setUnreadCount,
} = uiSlice.actions;

export default uiSlice.reducer;
```

### Bước 6: Update main.jsx để sử dụng Redux

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

---

## P5.3: Session Persistence

### Tạo Auth Service

**File**: `client/src/services/authService.js`

```javascript
import axios from 'axios';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/v1';

const authService = {
  /**
   * Kiểm tra token có hợp lệ không
   */
  isTokenValid: (token) => {
    if (!token) return false;
    try {
      const [, payload] = token.split('.');
      if (!payload) return false;
      
      const decoded = JSON.parse(atob(payload));
      const expiresIn = decoded.exp * 1000;
      return expiresIn > Date.now();
    } catch (error) {
      return false;
    }
  },

  /**
   * Refresh token nếu hết hạn
   */
  refreshToken: async (token) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      return response.data.data.token;
    } catch (error) {
      throw new Error('Không thể refresh token');
    }
  },

  /**
   * Lấy thông tin user hiện tại
   */
  getCurrentUser: async (token) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/auth/me`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      throw new Error('Không thể tải thông tin user');
    }
  },

  /**
   * Logout
   */
  logout: async (token) => {
    try {
      await axios.post(
        `${API_BASE_URL}/auth/logout`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error('Lỗi logout:', error);
    }
  },
};

export default authService;
```

### Custom Hook cho Auth

**File**: `client/src/hooks/useAuth.js`

```javascript
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import {
  setToken,
  setUser,
  setLoading,
  setError,
  clearAuth,
} from '../store/slices/authSlice';
import authService from '../services/authService';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { token, user, isLoading, error } = useSelector(state => state.auth);

  /**
   * Khởi tạo auth - check token khi app load
   */
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      
      if (savedToken) {
        // Check token hợp lệ
        if (!authService.isTokenValid(savedToken)) {
          dispatch(clearAuth());
          return;
        }

        // Load user profile
        dispatch(setLoading(true));
        try {
          const userData = await authService.getCurrentUser(savedToken);
          dispatch(setUser(userData));
          dispatch(setToken(savedToken));
        } catch (err) {
          console.error('Lỗi load user:', err);
          dispatch(setError(err.message));
          dispatch(clearAuth());
        } finally {
          dispatch(setLoading(false));
        }
      }
    };

    initAuth();
  }, [dispatch]);

  const login = (newToken) => {
    dispatch(setToken(newToken));
  };

  const logout = async () => {
    try {
      await authService.logout(token);
    } catch (error) {
      console.error('Lỗi logout:', error);
    }
    dispatch(clearAuth());
  };

  return {
    token,
    user,
    isLoading,
    error,
    isAuthenticated: !!token && !!user,
    login,
    logout,
  };
};

export default useAuth;
```

---

## P5.4: WebSocket cho Real-time (Tùy chọn)

### Cài đặt Socket.io

```bash
npm install socket.io-client
```

### Tạo Socket Service

**File**: `client/src/services/socketService.js`

```javascript
import io from 'socket.io-client';

const SOCKET_URL = process.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket kết nối thành công');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket ngắt kết nối');
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket lỗi:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Listen for comment updates
  onCommentAdded(callback) {
    this.socket?.on('comment:added', callback);
  }

  // Listen for activity updates
  onActivityAdded(callback) {
    this.socket?.on('activity:added', callback);
  }

  // Listen for notifications
  onNotification(callback) {
    this.socket?.on('notification:new', callback);
  }

  // Emit events
  emitCommentAdded(comment) {
    this.socket?.emit('comment:add', comment);
  }

  emitActivityLogged(activity) {
    this.socket?.emit('activity:log', activity);
  }
}

export default new SocketService();
```

### Hook cho Socket

**File**: `client/src/hooks/useSocket.js`

```javascript
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import socketService from '../services/socketService';
import { addNotification } from '../store/slices/uiSlice';

export const useSocket = () => {
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.token);

  useEffect(() => {
    if (token) {
      socketService.connect(token);

      // Listen for notifications
      socketService.onNotification((notification) => {
        dispatch(addNotification(notification));
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [token, dispatch]);

  return socketService;
};

export default useSocket;
```

---

## P5.5: Tối ưu hóa Hiệu suất

### Code Splitting Components

**File**: `client/src/components/phase4/Phase4Dashboard.jsx`

```javascript
import React, { lazy, Suspense, useState } from 'react';

// Lazy load các components
const ReviewPanel = lazy(() => import('./ReviewPanel'));
const CollaborationDashboard = lazy(() => import('./CollaborationDashboard'));
const ComplianceDashboard = lazy(() => import('./ComplianceDashboard'));
const SearchAnalyticsDashboard = lazy(() => import('./SearchAnalyticsDashboard'));
const NotificationCenter = lazy(() => import('./NotificationCenter'));
const TemplateLibraryHub = lazy(() => import('./TemplateLibraryHub'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-96">
    <div className="text-gray-500">⏳ Đang tải component...</div>
  </div>
);

export const Phase4Dashboard = (props) => {
  const [currentView, setCurrentView] = useState('home');

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {currentView === 'review' && <ReviewPanel {...props} />}
      {currentView === 'collab' && <CollaborationDashboard {...props} />}
      {currentView === 'compliance' && <ComplianceDashboard {...props} />}
      {currentView === 'search' && <SearchAnalyticsDashboard {...props} />}
      {currentView === 'notifications' && <NotificationCenter {...props} />}
      {currentView === 'templates' && <TemplateLibraryHub {...props} />}
    </Suspense>
  );
};

export default Phase4Dashboard;
```

### Optimize Images

```javascript
// Sử dụng responsive images
<img
  src="logo.webp"
  srcSet="logo-small.webp 480w, logo.webp 1024w"
  sizes="(max-width: 600px) 480px, 1024px"
  alt="Logo"
/>

// Hoặc sử dụng lazy loading
<img
  src="image.webp"
  loading="lazy"
  alt="Hình ảnh"
/>
```

---

## P5.6: Thiết lập Test Tự động

### Cài đặt Testing Library

```bash
npm install -D @testing-library/react @testing-library/jest-dom vitest @vitest/ui
```

### Viết Test cho Component

**File**: `client/src/components/phase4/ReviewPanel.test.jsx`

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewPanel from './ReviewPanel';

describe('ReviewPanel Component', () => {
  const mockProps = {
    draftId: 'test-draft-123',
    token: 'test-token-xyz',
  };

  test('hiển thị component mà không lỗi', () => {
    render(<ReviewPanel {...mockProps} />);
    expect(screen.getByText(/Contract Review/i)).toBeInTheDocument();
  });

  test('load dữ liệu review từ API', async () => {
    render(<ReviewPanel {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Risk Assessment/i)).toBeInTheDocument();
    });
  });

  test('thêm comment thành công', async () => {
    render(<ReviewPanel {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Add a comment/i);
    fireEvent.change(textarea, { target: { value: 'Test comment' } });
    
    const button = screen.getByText(/Add Comment/i);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });
  });

  test('phê duyệt review thành công', async () => {
    render(<ReviewPanel {...mockProps} />);
    
    const approveButton = screen.getByText(/Approve Review/i);
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText(/approved/i)).toBeInTheDocument();
    });
  });
});
```

### Chạy Tests

```bash
npm run test              # Chạy tất cả tests
npm run test:watch       # Watch mode
npm run test:ui          # UI mode
npm run test:coverage    # Coverage report
```

---

## P5.7: Chuẩn bị Production Deployment

### Production Build

```bash
npm run build
```

### Build Configuration

**File**: `client/vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'phase4-core': ['./src/components/phase4/Phase4Dashboard.jsx'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux': ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

### Environment Variables

**File**: `client/.env.production`

```bash
VITE_API_URL=https://api.yourapp.com/v1
VITE_SOCKET_URL=https://yourapp.com
VITE_APP_NAME=LegalReview
```

---

## 📊 Công việc Chi tiết

### Tuần 1:
- [x] P5.1: Tích hợp PHASE 4 vào App.jsx
- [x] P5.2: Thiết lập Redux
- [x] P5.3: Session persistence

### Tuần 2:
- [ ] P5.4: WebSocket real-time
- [ ] P5.5: Tối ưu hiệu suất
- [ ] P5.6: Tests tự động

### Tuần 3:
- [ ] P5.7: Production prep
- [ ] Bug fixes
- [ ] Performance testing

---

## ✅ Success Criteria

✅ Tất cả component tích hợp thành công  
✅ Redux state management hoạt động  
✅ Session persistence lưu được  
✅ WebSocket kết nối real-time  
✅ Bundle size < 500KB (gzip)  
✅ 90%+ test coverage  
✅ Performance score > 90  
✅ Ready for production

---

**Status**: 🚀 Sẵn sàng bắt đầu PHASE 5
**Thời gian ước tính**: 2-3 tuần
**Độ phức tạp**: Trung bình

Chúng ta sẽ bắt đầu từ **P5.1** trước nhé! 🎯
