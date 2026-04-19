import { createSlice } from '@reduxjs/toolkit';

/**
 * UI Slice
 * Quản lý UI state: sidebar, theme, notifications, modal, etc
 */
const initialState = {
  sidebarOpen: JSON.parse(localStorage.getItem('sidebarOpen') ?? 'true'),
  darkMode: JSON.parse(localStorage.getItem('darkMode') ?? 'false'),
  notifications: [],
  unreadCount: 0,
  modals: {
    isOpen: false,
    type: null,
    data: null,
  },
  toast: {
    isOpen: false,
    message: '',
    type: 'info', // 'info' | 'success' | 'warning' | 'error'
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Toggle sidebar
     */
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
      localStorage.setItem('sidebarOpen', JSON.stringify(state.sidebarOpen));
    },

    /**
     * Thiết lập sidebar open/close
     */
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
      localStorage.setItem('sidebarOpen', JSON.stringify(action.payload));
    },

    /**
     * Toggle dark mode
     */
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      localStorage.setItem('darkMode', JSON.stringify(state.darkMode));
    },

    /**
     * Thiết lập dark mode
     */
    setDarkMode(state, action) {
      state.darkMode = action.payload;
      localStorage.setItem('darkMode', JSON.stringify(action.payload));
    },

    /**
     * Thêm notification
     */
    addNotification(state, action) {
      const notification = {
        id: Date.now(),
        timestamp: new Date(),
        ...action.payload,
      };
      state.notifications.unshift(notification);
      state.unreadCount += 1;

      // Tự động xóa sau 5 giây nếu không phải lỗi
      if (notification.type !== 'error') {
        setTimeout(() => {
          state.notifications = state.notifications.filter(n => n.id !== notification.id);
        }, 5000);
      }
    },

    /**
     * Xóa notification
     */
    removeNotification(state, action) {
      state.notifications = state.notifications.filter(
        n => n.id !== action.payload
      );
    },

    /**
     * Clear tất cả notifications
     */
    clearNotifications(state) {
      state.notifications = [];
      state.unreadCount = 0;
    },

    /**
     * Cập nhật unread count
     */
    setUnreadCount(state, action) {
      state.unreadCount = action.payload;
    },

    /**
     * Mark notifications as read
     */
    markNotificationsAsRead(state) {
      state.unreadCount = 0;
    },

    /**
     * Mở modal
     */
    openModal(state, action) {
      state.modals = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload.data || null,
      };
    },

    /**
     * Đóng modal
     */
    closeModal(state) {
      state.modals = {
        isOpen: false,
        type: null,
        data: null,
      };
    },

    /**
     * Hiển thị toast message
     */
    showToast(state, action) {
      state.toast = {
        isOpen: true,
        message: action.payload.message,
        type: action.payload.type || 'info',
      };
    },

    /**
     * Ẩn toast message
     */
    hideToast(state) {
      state.toast = {
        isOpen: false,
        message: '',
        type: 'info',
      };
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleDarkMode,
  setDarkMode,
  addNotification,
  removeNotification,
  clearNotifications,
  setUnreadCount,
  markNotificationsAsRead,
  openModal,
  closeModal,
  showToast,
  hideToast,
} = uiSlice.actions;

export default uiSlice.reducer;
