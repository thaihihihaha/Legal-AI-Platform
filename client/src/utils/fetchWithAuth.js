/**
 * Helper function để gửi fetch request với token và tự động xử lý token hết hạn
 * Nếu nhận 401, sẽ xóa token và redirect về login
 */
export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('longpl_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Nếu token hết hạn (401), xóa token và redirect về login
  if (response.status === 401) {
    localStorage.removeItem('longpl_token');
    window.location.href = '/login';
    throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
  }

  return response;
}

/**
 * Lấy JWT token từ localStorage
 */
export function getToken() {
  return localStorage.getItem('longpl_token') || '';
}

/**
 * Xóa token và redirect về login
 */
export function logout() {
  localStorage.removeItem('longpl_token');
  window.location.href = '/login';
}
