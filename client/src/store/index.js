import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import draftReducer from './slices/draftSlice';
import uiReducer from './slices/uiSlice';

/**
 * Redux Store Configuration
 * Quản lý toàn bộ state của ứng dụng
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,      // Authentication state
    draft: draftReducer,    // Draft management state
    ui: uiReducer,         // UI state (sidebar, notifications, etc)
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Bỏ qua warnings cho non-serializable values
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.user'],
      },
    }),
});

export default store;
