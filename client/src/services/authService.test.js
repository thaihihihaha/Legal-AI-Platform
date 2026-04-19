import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';

/**
 * Mock axios
 */
vi.mock('axios', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
    },
  };
});

import authService from './authService';

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isTokenValid', () => {
    test('trả về false nếu không có token', () => {
      expect(authService.isTokenValid(null)).toBe(false);
      expect(authService.isTokenValid('')).toBe(false);
      expect(authService.isTokenValid(undefined)).toBe(false);
    });

    test('trả về false nếu token không hợp lệ (invalid format)', () => {
      expect(authService.isTokenValid('invalid-token')).toBe(false);
      expect(authService.isTokenValid('a.b')).toBe(false);
      expect(authService.isTokenValid('....')).toBe(false);
    });

    test('trả về false nếu token hết hạn', () => {
      // Tạo token hết hạn
      const expiredPayload = btoa(
        JSON.stringify({
          sub: 1,
          name: 'Test',
          exp: Math.floor(Date.now() / 1000) - 3600, // 1 giờ trước
        })
      );
      const expiredToken = `header.${expiredPayload}.signature`;

      expect(authService.isTokenValid(expiredToken)).toBe(false);
    });

    test('trả về true nếu token hợp lệ', () => {
      // Tạo token hợp lệ
      const validPayload = btoa(
        JSON.stringify({
          sub: 1,
          name: 'Test',
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 giờ sau
        })
      );
      const validToken = `header.${validPayload}.signature`;

      expect(authService.isTokenValid(validToken)).toBe(true);
    });

    test('trả về true nếu không có exp claim', () => {
      // Một số token không có exp claim
      const payload = btoa(JSON.stringify({ sub: 1, name: 'Test' }));
      const token = `header.${payload}.signature`;

      expect(authService.isTokenValid(token)).toBe(true);
    });
  });

  describe('decodeToken', () => {
    test('decode JWT token thành công', () => {
      const payload = btoa(
        JSON.stringify({
          sub: 1,
          name: 'John Doe',
          email: 'john@example.com',
        })
      );
      const token = `header.${payload}.signature`;

      const decoded = authService.decodeToken(token);
      expect(decoded.sub).toBe(1);
      expect(decoded.name).toBe('John Doe');
      expect(decoded.email).toBe('john@example.com');
    });

    test('trả về null nếu decode thất bại', () => {
      expect(authService.decodeToken('invalid')).toBeNull();
      expect(authService.decodeToken('a.b.c')).toBeNull();
    });
  });

  describe('login', () => {
    test('đăng nhập thành công', async () => {
      const mockResponse = {
        data: {
          data: {
            token: 'test-token-123',
            user: { id: 1, name: 'John', email: 'john@example.com' },
          },
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await authService.login('john@example.com', 'password123');

      expect(result.token).toBe('test-token-123');
      expect(result.user.id).toBe(1);
      expect(localStorage.getItem('auth_token')).toBe('test-token-123');
    });

    test('throws error khi login fail', async () => {
      axios.post.mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        authService.login('john@example.com', 'wrong-password')
      ).rejects.toThrow('Lỗi đăng nhập');
    });
  });

  describe('logout', () => {
    test('logout thành công', async () => {
      axios.post.mockResolvedValue({ data: { success: true } });
      localStorage.setItem('auth_token', 'test-token');

      await authService.logout('test-token');

      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    test('logout vẫn clear token ngay cả khi API fail', async () => {
      axios.post.mockRejectedValue(new Error('API error'));
      localStorage.setItem('auth_token', 'test-token');

      await authService.logout('test-token');

      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    test('lấy user profile thành công', async () => {
      const mockUser = { id: 1, name: 'John', email: 'john@example.com' };
      axios.get.mockResolvedValue({ data: { data: mockUser } });

      const user = await authService.getCurrentUser('test-token');

      expect(user).toEqual(mockUser);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    test('throws error khi không thể lấy user', async () => {
      axios.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        authService.getCurrentUser('invalid-token')
      ).rejects.toThrow('Lỗi tải user profile');
    });
  });

  describe('refreshToken', () => {
    test('refresh token thành công', async () => {
      const newToken = 'new-token-456';
      axios.post.mockResolvedValue({
        data: { data: { token: newToken } },
      });

      const token = await authService.refreshToken('old-token-123');

      expect(token).toBe(newToken);
      expect(localStorage.getItem('auth_token')).toBe(newToken);
    });

    test('clear token khi refresh fail', async () => {
      axios.post.mockRejectedValue(new Error('Unauthorized'));
      localStorage.setItem('auth_token', 'old-token');

      await expect(
        authService.refreshToken('old-token')
      ).rejects.toThrow();

      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('updateProfile', () => {
    test('cập nhật profile thành công', async () => {
      const updatedUser = { id: 1, name: 'John Updated', email: 'john@example.com' };
      axios.put.mockResolvedValue({ data: { data: updatedUser } });

      const result = await authService.updateProfile('test-token', {
        name: 'John Updated',
      });

      expect(result).toEqual(updatedUser);
    });

    test('throws error khi update fail', async () => {
      axios.put.mockRejectedValue(new Error('Bad request'));

      await expect(
        authService.updateProfile('test-token', { invalid: 'data' })
      ).rejects.toThrow('Lỗi cập nhật profile');
    });
  });
});
