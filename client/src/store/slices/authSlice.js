import { createSlice } from '@reduxjs/toolkit';

/**
 * Auth Slice
 * Quản lý authentication state: token, user, loading, errors
 */
const initialState = {
  token: localStorage.getItem('auth_token') || null,
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Cập nhật authentication token
     */
    setToken(state, action) {
      state.token = action.payload;
      if (action.payload) {
        localStorage.setItem('auth_token', action.payload);
        state.isAuthenticated = true;
      } else {
        localStorage.removeItem('auth_token');
        state.isAuthenticated = false;
      }
    },

    /**
     * Cập nhật user info
     */
    setUser(state, action) {
      state.user = action.payload;
      if (action.payload) {
        state.isAuthenticated = true;
      } else {
        state.isAuthenticated = false;
      }
    },

    /**
     * Cập nhật loading state
     */
    setLoading(state, action) {
      state.isLoading = action.payload;
    },

    /**
     * Cập nhật error message
     */
    setError(state, action) {
      state.error = action.payload;
    },

    /**
     * Clear auth - logout
     */
    clearAuth(state) {
      state.token = null;
      state.user = null;
      state.error = null;
      state.isAuthenticated = false;
      localStorage.removeItem('auth_token');
    },

    /**
     * Update user profile
     */
    updateUser(state, action) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const {
  setToken,
  setUser,
  setLoading,
  setError,
  clearAuth,
  updateUser,
} = authSlice.actions;

export default authSlice.reducer;
