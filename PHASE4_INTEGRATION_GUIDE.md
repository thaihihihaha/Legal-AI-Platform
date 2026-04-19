# PHASE 4 INTEGRATION GUIDE

**Purpose**: Step-by-step guide to integrate PHASE 4 components into main application
**Target File**: `client/src/App.jsx`
**Complexity**: Medium (straightforward component import and routing)
**Time**: 15-30 minutes

---

## Quick Integration (5 minutes)

### Step 1: Import Phase 4 Dashboard

```javascript
// client/src/App.jsx
import { Phase4Dashboard } from './components/phase4/Phase4Dashboard';
```

### Step 2: Add Route

```javascript
function App() {
  // Your existing code...
  
  return (
    <Routes>
      {/* Your existing routes */}
      <Route path="/dashboard/*" element={<Phase4Dashboard {...props} />} />
    </Routes>
  );
}
```

### Step 3: Pass Required Props

```javascript
<Phase4Dashboard 
  draftId={currentDraftId}
  userId={authUser.id}
  companyId={authUser.companyId}
  token={authToken}
/>
```

---

## Complete Integration Example

### File: client/src/App.jsx

```javascript
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Phase4Dashboard } from './components/phase4/Phase4Dashboard';
import LoginPage from './pages/LoginPage';
import NotFound from './pages/NotFound';

function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDraft, setCurrentDraft] = useState(null);

  useEffect(() => {
    // Load user from auth token
    if (authToken) {
      loadUserFromToken(authToken);
    }
  }, [authToken]);

  const loadUserFromToken = async (token) => {
    try {
      const response = await fetch('/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const user = await response.json();
      setCurrentUser(user.data);
    } catch (error) {
      console.error('Error loading user:', error);
      setAuthToken(null);
      localStorage.removeItem('token');
    }
  };

  if (!authToken) {
    return <LoginPage onLogin={(token) => {
      setAuthToken(token);
      localStorage.setItem('token', token);
    }} />;
  }

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/dashboard/*" 
          element={
            <Phase4Dashboard 
              draftId={currentDraft?.id || 'default-draft'}
              userId={currentUser.id}
              companyId={currentUser.company_id}
              token={authToken}
            />
          } 
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
```

---

## Advanced Integration with State Management

### Option 1: Using React Context

#### Create Context Provider

```javascript
// client/src/context/AppContext.js
import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDraft, setCurrentDraft] = useState(null);
  const [notifications, setNotifications] = useState([]);

  return (
    <AppContext.Provider 
      value={{
        authToken,
        setAuthToken,
        currentUser,
        setCurrentUser,
        currentDraft,
        setCurrentDraft,
        notifications,
        setNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
```

#### Use in App.jsx

```javascript
import { AppProvider, useApp } from './context/AppContext';
import { Phase4Dashboard } from './components/phase4/Phase4Dashboard';

function AppContent() {
  const { authToken, currentUser, currentDraft } = useApp();

  if (!currentUser) return <Loading />;

  return (
    <Routes>
      <Route 
        path="/dashboard/*" 
        element={
          <Phase4Dashboard 
            draftId={currentDraft?.id}
            userId={currentUser.id}
            companyId={currentUser.company_id}
            token={authToken}
          />
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
```

### Option 2: Using Redux Toolkit

```javascript
// client/src/store/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('token'),
    user: null,
    currentDraft: null,
  },
  reducers: {
    setToken(state, action) {
      state.token = action.payload;
      localStorage.setItem('token', action.payload);
    },
    setUser(state, action) {
      state.user = action.payload;
    },
    setCurrentDraft(state, action) {
      state.currentDraft = action.payload;
    },
  },
});

export default authSlice.reducer;
```

---

## Using Individual Components

### If You Don't Need Master Dashboard

Use individual components directly:

```javascript
import { 
  ReviewPanel,
  CollaborationDashboard,
  ComplianceDashboard,
  SearchAnalyticsDashboard,
  NotificationCenter,
  TemplateLibraryHub
} from './components/phase4/index.js';

function MyPage({ draftId, token }) {
  return (
    <div className="flex gap-4">
      <ReviewPanel draftId={draftId} token={token} />
      <CollaborationDashboard draftId={draftId} token={token} />
    </div>
  );
}
```

---

## API Configuration

### Create API Service

```javascript
// client/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:3000/v1',
  timeout: 10000,
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Environment Variables

```bash
# client/.env
VITE_API_URL=http://localhost:3000/v1
VITE_APP_NAME=LegalReview
VITE_FEATURES=phase4
```

---

## Routing Setup

### Option 1: Simple Route

```javascript
<Route 
  path="/dashboard" 
  element={<Phase4Dashboard {...props} />} 
/>
```

### Option 2: Nested Routes

```javascript
<Route path="/dashboard" element={<Phase4Layout />}>
  <Route path="review/:draftId" element={<ReviewPanel />} />
  <Route path="collaboration/:draftId" element={<CollaborationDashboard />} />
  <Route path="compliance/:draftId" element={<ComplianceDashboard />} />
  <Route path="search" element={<SearchAnalyticsDashboard />} />
  <Route path="notifications" element={<NotificationCenter />} />
  <Route path="templates" element={<TemplateLibraryHub />} />
</Route>
```

### Option 3: Programmatic Navigation

```javascript
import { useNavigate } from 'react-router-dom';

function YourComponent() {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate('/dashboard/review/draft-123')}>
      Open Review
    </button>
  );
}
```

---

## Component Wrapper (Optional)

### Create Wrapper for Common Props

```javascript
// client/src/components/Phase4Wrapper.jsx
import { Phase4Dashboard } from './phase4/Phase4Dashboard';
import { useApp } from '../context/AppContext';

export const Phase4Wrapper = () => {
  const { authToken, currentUser, currentDraft } = useApp();

  if (!currentUser) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <Phase4Dashboard 
      draftId={currentDraft?.id || 'default-draft'}
      userId={currentUser.id}
      companyId={currentUser.company_id}
      token={authToken}
    />
  );
};
```

---

## Testing Integration

### Quick Test Checklist

```javascript
// Test that component renders
<div>
  <Phase4Dashboard 
    draftId="test-draft"
    userId="test-user"
    companyId="test-company"
    token="test-token"
  />
</div>

// Verify no console errors
// Check Network tab for API calls
// Click through each menu item
// Verify all tabs work
// Test form submissions
// Check error handling
```

---

## Environment Setup

### Development

```bash
cd client
npm install
npm run dev
# Open http://localhost:5173
```

### Production Build

```bash
npm run build
npm run preview
```

---

## Troubleshooting

### Issue: Components Not Rendering

**Solution**:
```javascript
// Check that props are passed correctly
console.log('Props:', { draftId, userId, companyId, token });

// Verify token is valid
const isValidToken = token && token.startsWith('Bearer ');
```

### Issue: API Calls Failing

**Solution**:
```javascript
// Check browser console for errors
// Verify API_URL is correct
// Check that token is being sent in Authorization header
// Verify backend is running (http://localhost:3000)
```

### Issue: Styles Not Applied

**Solution**:
```bash
# Make sure TailwindCSS is installed
npm install -D tailwindcss postcss autoprefixer

# Check tailwind.config.js has correct paths
content: ['./src/**/*.{js,jsx}']

# Run `npm run dev` to rebuild styles
```

---

## Optional Enhancements

### Add Error Boundary

```javascript
import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}

// Use it
<ErrorBoundary>
  <Phase4Dashboard {...props} />
</ErrorBoundary>
```

### Add Loading Boundary

```javascript
import { Suspense } from 'react';

<Suspense fallback={<Loading />}>
  <Phase4Dashboard {...props} />
</Suspense>
```

### Add Analytics

```javascript
// Track component views
useEffect(() => {
  analytics.track('View Phase4 Dashboard');
}, []);

// Track user interactions
const handleReviewApprove = async () => {
  analytics.track('Approve Review', { draftId });
  // ... rest of code
};
```

---

## Performance Optimization

### Enable Code Splitting

```javascript
import { lazy, Suspense } from 'react';

const Phase4Dashboard = lazy(() => 
  import('./components/phase4/Phase4Dashboard')
);

// Use with Suspense
<Suspense fallback={<Loading />}>
  <Phase4Dashboard {...props} />
</Suspense>
```

### Implement Lazy Loading

```javascript
// In Phase4Dashboard.jsx
const ReviewPanel = lazy(() => import('./ReviewPanel'));
const ComplianceDashboard = lazy(() => import('./ComplianceDashboard'));

// Each component loads only when needed
```

---

## Security Considerations

### Verify Token Before Rendering

```javascript
const isTokenValid = (token) => {
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    return decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};

// Use it
{authToken && isTokenValid(authToken) ? (
  <Phase4Dashboard {...props} />
) : (
  <LoginPage />
)}
```

### Secure Token Storage

```javascript
// Use httpOnly cookies instead of localStorage (more secure)
// OR use sessionStorage (clears when tab closes)

// Avoid storing sensitive data in localStorage
localStorage.removeItem('password');
localStorage.removeItem('apiKey');

// Only store JWT token
localStorage.setItem('token', jwtToken);
```

---

## Next Steps After Integration

1. **Test thoroughly**
   - Manual testing all features
   - Test error scenarios
   - Check performance

2. **Add monitoring**
   - Error tracking (Sentry)
   - Performance monitoring
   - User analytics

3. **Deploy to production**
   - Build for production
   - Configure CDN
   - Set up SSL/HTTPS

4. **Collect feedback**
   - User testing
   - A/B testing
   - Feature refinement

---

## Files Modified/Created

```
client/src/
├── App.jsx                 (Update - add Phase4Dashboard route)
├── components/
│   └── phase4/            (New - 8 components)
│       ├── ReviewPanel.jsx
│       ├── CollaborationDashboard.jsx
│       ├── ComplianceDashboard.jsx
│       ├── SearchAnalyticsDashboard.jsx
│       ├── NotificationCenter.jsx
│       ├── TemplateLibraryHub.jsx
│       ├── Phase4Dashboard.jsx
│       └── index.js
├── context/               (Optional - new)
│   └── AppContext.js
├── services/              (Optional - new)
│   └── api.js
└── .env                   (Update - add VITE_API_URL)
```

---

## Integration Checklist

- [ ] Import Phase4Dashboard in App.jsx
- [ ] Add route for dashboard
- [ ] Pass required props (draftId, userId, companyId, token)
- [ ] Test component renders
- [ ] Verify API calls work
- [ ] Check error handling
- [ ] Test all menu items
- [ ] Test all features
- [ ] Check responsive design
- [ ] Verify accessibility
- [ ] Test on different browsers
- [ ] Deploy to production

---

## Support

### Common Questions

**Q: Can I use individual components?**
A: Yes, import them from `./components/phase4/index.js`

**Q: Do I need Redux?**
A: No, Context API is sufficient, but Redux is recommended for complex apps

**Q: How do I handle authentication?**
A: Pass `token` prop from your auth system (JWT recommended)

**Q: Can I customize styling?**
A: Yes, modify TailwindCSS classes (all in JSX)

**Q: How do I add new features?**
A: Create new components in phase4 folder and add routes

---

## Estimated Effort

| Task | Time | Complexity |
|------|------|-----------|
| Import & routing | 5 min | Easy |
| Props setup | 5 min | Easy |
| Testing | 15 min | Medium |
| Error fixing | 10 min | Medium |
| **Total** | **~35 min** | **Medium** |

---

**Integration Ready**: ✅ All components production-ready
**Complexity**: Medium (straightforward integration)
**Time**: ~35 minutes for full integration
**Next**: Deploy to production! 🚀
