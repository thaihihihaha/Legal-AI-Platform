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

/**
 * Custom Hook useAuth
 * Quản lý authentication state và logic
 * @returns {object} Auth state và methods
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const { token, user, isLoading, error, isAuthenticated } = useSelector(
    state => state.auth
  );

  /**
   * Khởi tạo auth - check token khi app load
   */
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');

      if (savedToken) {
        // Kiểm tra token hợp lệ
        if (!authService.isTokenValid(savedToken)) {
          console.warn('⚠️ Token không hợp lệ hoặc hết hạn');
          dispatch(clearAuth());
          return;
        }

        // Load user profile
        dispatch(setLoading(true));
        try {
          const userData = await authService.getCurrentUser(savedToken);
          dispatch(setUser(userData));
          dispatch(setToken(savedToken));
          console.log('✅ Đã load user profile thành công');
        } catch (err) {
          console.error('❌ Lỗi load user profile:', err);
          dispatch(setError(err.message));
          dispatch(clearAuth());
        } finally {
          dispatch(setLoading(false));
        }
      }
    };

    initAuth();
  }, [dispatch]);

  /**
   * Login
   * @param {string} email - Email
   * @param {string} password - Password
   * @returns {Promise<boolean>} true nếu login thành công
   */
  const login = async (email, password) => {
    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const { token: newToken, user: userData } = await authService.login(
        email,
        password
      );
      dispatch(setToken(newToken));
      dispatch(setUser(userData));
      console.log('✅ Đăng nhập thành công');
      return true;
    } catch (err) {
      console.error('❌ Lỗi đăng nhập:', err);
      dispatch(setError(err.message));
      return false;
    } finally {
      dispatch(setLoading(false));
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      if (token) {
        await authService.logout(token);
      }
    } catch (error) {
      console.error('❌ Lỗi logout:', error);
    }
    dispatch(clearAuth());
    console.log('✅ Đã đăng xuất');
  };

  /**
   * Refresh token
   * @returns {Promise<boolean>} true nếu refresh thành công
   */
  const refreshAuth = async () => {
    if (!token) return false;

    try {
      const newToken = await authService.refreshToken(token);
      dispatch(setToken(newToken));
      console.log('✅ Refresh token thành công');
      return true;
    } catch (err) {
      console.error('❌ Lỗi refresh token:', err);
      dispatch(setError(err.message));
      dispatch(clearAuth());
      return false;
    }
  };

  /**
   * Update user profile
   * @param {object} data - User data to update
   * @returns {Promise<boolean>} true nếu update thành công
   */
  const updateProfile = async (data) => {
    if (!token) return false;

    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const updatedUser = await authService.updateProfile(token, data);
      dispatch(setUser(updatedUser));
      console.log('✅ Cập nhật profile thành công');
      return true;
    } catch (err) {
      console.error('❌ Lỗi cập nhật profile:', err);
      dispatch(setError(err.message));
      return false;
    } finally {
      dispatch(setLoading(false));
    }
  };

  /**
   * Change password
   * @param {string} oldPassword - Old password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} true nếu thay đổi thành công
   */
  const changePassword = async (oldPassword, newPassword) => {
    if (!token) return false;

    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      await authService.changePassword(token, oldPassword, newPassword);
      console.log('✅ Đổi mật khẩu thành công');
      return true;
    } catch (err) {
      console.error('❌ Lỗi đổi mật khẩu:', err);
      dispatch(setError(err.message));
      return false;
    } finally {
      dispatch(setLoading(false));
    }
  };

  return {
    // State
    token,
    user,
    isLoading,
    error,
    isAuthenticated,

    // Methods
    login,
    logout,
    refreshAuth,
    updateProfile,
    changePassword,
  };
};

export default useAuth;
