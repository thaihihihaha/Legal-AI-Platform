import io from 'socket.io-client';

/**
 * Socket Service
 * Quản lý WebSocket connection cho real-time features
 */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  /**
   * Kết nối đến WebSocket server
   * @param {string} token - Auth token
   * @param {object} options - Socket options
   */
  connect(token, options = {}) {
    if (this.socket?.connected) {
      console.log('✅ Socket đã kết nối rồi');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
      ...options,
    });

    this._setupListeners();
  }

  /**
   * Setup internal socket listeners
   */
  _setupListeners() {
    this.socket.on('connect', () => {
      console.log('✅ WebSocket kết nối thành công, ID:', this.socket.id);
      this._emitListeners('connect', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket ngắt kết nối:', reason);
      this._emitListeners('disconnect', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket lỗi kết nối:', error);
      this._emitListeners('error', error);
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket lỗi:', error);
      this._emitListeners('error', error);
    });

    this.socket.on('reconnect_attempt', () => {
      console.log('🔄 Đang cố gắng kết nối lại...');
    });
  }

  /**
   * Ngắt kết nối
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('✅ Đã ngắt kết nối WebSocket');
    }
  }

  /**
   * Kiểm tra kết nối
   */
  isConnected() {
    return this.socket?.connected ?? false;
  }

  /**
   * Đăng ký listener cho event
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Cũng lắng nghe trên socket
    this.socket?.on(event, callback);
  }

  /**
   * Hủy đăng ký listener
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }

    this.socket?.off(event, callback);
  }

  /**
   * Emit local listeners
   */
  _emitListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Lỗi trong listener ${event}:`, error);
        }
      });
    }
  }

  /**
   * Emit event đến server
   * @param {string} event - Event name
   * @param {object} data - Data
   * @param {function} callback - Response callback
   */
  emit(event, data = {}, callback) {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket chưa kết nối');
      return;
    }

    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }

  /**
   * Emit event và đợi response
   * @param {string} event - Event name
   * @param {object} data - Data
   * @returns {Promise} Response data
   */
  emitAsync(event, data = {}) {
    return new Promise((resolve, reject) => {
      this.emit(event, data, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  // ============ Specific Events ============

  /**
   * Listen for comment updates
   */
  onCommentAdded(callback) {
    this.on('comment:added', callback);
  }

  /**
   * Emit comment added
   */
  emitCommentAdded(comment) {
    this.emit('comment:added', comment);
  }

  /**
   * Listen for activity updates
   */
  onActivityAdded(callback) {
    this.on('activity:added', callback);
  }

  /**
   * Emit activity logged
   */
  emitActivityLogged(activity) {
    this.emit('activity:logged', activity);
  }

  /**
   * Listen for notifications
   */
  onNotification(callback) {
    this.on('notification:new', callback);
  }

  /**
   * Listen for draft updates
   */
  onDraftUpdated(callback) {
    this.on('draft:updated', callback);
  }

  /**
   * Emit draft update
   */
  emitDraftUpdated(draft) {
    this.emit('draft:updated', draft);
  }

  /**
   * Listen for collaboration updates
   */
  onCollaborationUpdate(callback) {
    this.on('collab:updated', callback);
  }

  /**
   * Emit collaboration action
   */
  emitCollaborationAction(action) {
    this.emit('collab:action', action);
  }

  /**
   * Join room (e.g., draft room)
   */
  joinRoom(roomId, callback) {
    this.emit('room:join', { room_id: roomId }, callback);
  }

  /**
   * Leave room
   */
  leaveRoom(roomId, callback) {
    this.emit('room:leave', { room_id: roomId }, callback);
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      connected: this.isConnected(),
      socketId: this.socket?.id || null,
      url: SOCKET_URL,
      listeners: Array.from(this.listeners.keys()),
    };
  }
}

export default new SocketService();
