import { describe, test, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  setToken,
  setUser,
  setLoading,
  setError,
  clearAuth,
  updateUser,
} from '../slices/authSlice';

describe('authSlice', () => {
  let store;

  beforeEach(() => {
    localStorage.clear();
    store = configureStore({
      reducer: { auth: authReducer },
    });
  });

  describe('setToken', () => {
    test('cập nhật token và localStorage', () => {
      const testToken = 'test-token-xyz-123';
      store.dispatch(setToken(testToken));

      const state = store.getState().auth;
      expect(state.token).toBe(testToken);
      expect(state.isAuthenticated).toBe(true);
      expect(localStorage.getItem('auth_token')).toBe(testToken);
    });

    test('xóa token khi null', () => {
      store.dispatch(setToken('token'));
      store.dispatch(setToken(null));

      const state = store.getState().auth;
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('setUser', () => {
    test('cập nhật user info', () => {
      const testUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        company_id: 'comp-123',
      };
      store.dispatch(setUser(testUser));

      const state = store.getState().auth;
      expect(state.user).toEqual(testUser);
      expect(state.isAuthenticated).toBe(true);
    });

    test('xóa user khi null', () => {
      const testUser = { id: 1, name: 'John' };
      store.dispatch(setUser(testUser));
      store.dispatch(setUser(null));

      const state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setLoading', () => {
    test('cập nhật isLoading state', () => {
      store.dispatch(setLoading(true));
      expect(store.getState().auth.isLoading).toBe(true);

      store.dispatch(setLoading(false));
      expect(store.getState().auth.isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    test('cập nhật error message', () => {
      const errorMsg = 'Lỗi đăng nhập không hợp lệ';
      store.dispatch(setError(errorMsg));

      expect(store.getState().auth.error).toBe(errorMsg);
    });

    test('clear error', () => {
      store.dispatch(setError('Some error'));
      store.dispatch(setError(null));

      expect(store.getState().auth.error).toBeNull();
    });
  });

  describe('clearAuth', () => {
    test('xóa tất cả auth data', () => {
      // Setup
      store.dispatch(setToken('test-token'));
      store.dispatch(setUser({ id: 1, name: 'John' }));
      store.dispatch(setError('Some error'));

      // Clear
      store.dispatch(clearAuth());

      // Assert
      const state = store.getState().auth;
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.error).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('updateUser', () => {
    test('cập nhật user profile', () => {
      const initialUser = { id: 1, name: 'John', email: 'john@example.com' };
      store.dispatch(setUser(initialUser));

      const updateData = { name: 'John Updated' };
      store.dispatch(updateUser(updateData));

      const state = store.getState().auth;
      expect(state.user.name).toBe('John Updated');
      expect(state.user.id).toBe(1); // ID không thay đổi
      expect(state.user.email).toBe('john@example.com'); // Email không thay đổi
    });

    test('không làm gì nếu user không tồn tại', () => {
      const state = store.getState().auth;
      store.dispatch(updateUser({ name: 'New Name' }));

      expect(store.getState().auth.user).toBeNull();
    });
  });
});
