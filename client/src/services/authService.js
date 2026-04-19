import axios from 'axios';

/**
 * Auth Service
 * Xử lý tất cả authentication logic: login, logout, token refresh, user profile, etc
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/v1';

class AuthService {
  /**
   * Kiểm tra token có hợp lệ không
   * @param {string} token - JWT token
   * @returns {boolean} true nếu token hợp lệ và chưa hết hạn
   */
  isTokenValid(token) {
    if (!token) return false;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const payload = parts[1];
      const decoded = JSON.parse(atob(payload));

      // Check if token is expired
      if (decoded.exp) {
        const expiresIn = decoded.exp * 1000; // Convert to milliseconds
        return expiresIn > Date.now();
      }

      return true;
    } catch (error) {
      console.error('❌ Lỗi validate token:', error);
      return false;
    }
  }

  /**
   * Decode JWT token
   * @param {string} token - JWT token
   * @returns {object} decoded payload
   */
  decodeToken(token) {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (error) {
      console.error('❌ Lỗi decode token:', error);
      return null;
    }
  }

  /**
   * Login
   * @param {string} email - Email
   * @param {string} password - Password
   * @returns {Promise<{token: string, user: object}>}
   */
  async login(email, password) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { email, password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.data && response.data.data.token) {
        localStorage.setItem('auth_token', response.data.data.token);
        return {
          token: response.data.data.token,
          user: response.data.data.user,
        };
      }

      throw new Error('Không nhận được token từ server');
    } catch (error) {
      console.error('❌ Lỗi đăng nhập:', error);
      throw new Error(error.response?.data?.message || 'Lỗi đăng nhập');
    }
  }

  /**
   * Logout
   * @param {string} token - Auth token
   */
  async logout(token) {
    try {
      await axios.post(
        `${API_BASE_URL}/auth/logout`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('❌ Lỗi logout:', error);
      // Vẫn xóa token local ngay cả khi logout fail
    }

    localStorage.removeItem('auth_token');
  }

  /**
   * Lấy thông tin user hiện tại
   * @param {string} token - Auth token
   * @returns {Promise<object>} User data
   */
  async getCurrentUser(token) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/auth/me`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.data) {
        return response.data.data;
      }

      throw new Error('Không thể tải user profile');
    } catch (error) {
      console.error('❌ Lỗi tải user profile:', error);
      throw new Error(error.response?.data?.message || 'Lỗi tải user profile');
    }
  }

  /**
   * Refresh token
   * @param {string} token - Current token
   * @returns {Promise<string>} New token
   */
  async refreshToken(token) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.data && response.data.data.token) {
        const newToken = response.data.data.token;
        localStorage.setItem('auth_token', newToken);
        return newToken;
      }

      throw new Error('Không nhận được token mới');
    } catch (error) {
      console.error('❌ Lỗi refresh token:', error);
      // Clear token nếu refresh fail
      localStorage.removeItem('auth_token');
      throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }
  }

  /**
   * Update user profile
   * @param {string} token - Auth token
   * @param {object} data - User data to update
   * @returns {Promise<object>} Updated user
   */
  async updateProfile(token, data) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/auth/profile`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.data) {
        return response.data.data;
      }

      throw new Error('Không thể cập nhật profile');
    } catch (error) {
      console.error('❌ Lỗi cập nhật profile:', error);
      throw new Error(error.response?.data?.message || 'Lỗi cập nhật profile');
    }
  }

  /**
   * Change password
   * @param {string} token - Auth token
   * @param {string} oldPassword - Old password
   * @param {string} newPassword - New password
   */
  async changePassword(token, oldPassword, newPassword) {
    try {
      await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        { old_password: oldPassword, new_password: newPassword },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('❌ Lỗi đổi mật khẩu:', error);
      throw new Error(error.response?.data?.message || 'Lỗi đổi mật khẩu');
    }
  }

  /**
   * Request password reset
   * @param {string} email - Email
   */
  async requestPasswordReset(email) {
    try {
      await axios.post(
        `${API_BASE_URL}/auth/request-reset`,
        { email },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('❌ Lỗi request reset password:', error);
      throw new Error(error.response?.data?.message || 'Lỗi request reset password');
    }
  }

  /**
   * Reset password with token
   * @param {string} resetToken - Reset token
   * @param {string} newPassword - New password
   */
  async resetPassword(resetToken, newPassword) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/reset-password`,
        { token: resetToken, new_password: newPassword },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('❌ Lỗi reset password:', error);
      throw new Error(error.response?.data?.message || 'Lỗi reset password');
    }
  }

  /**
   * Verify email
   * @param {string} verificationToken - Verification token
   */
  async verifyEmail(verificationToken) {
    try {
      await axios.post(
        `${API_BASE_URL}/auth/verify-email`,
        { token: verificationToken },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('❌ Lỗi xác minh email:', error);
      throw new Error(error.response?.data?.message || 'Lỗi xác minh email');
    }
  }
}

export default new AuthService();
