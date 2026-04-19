import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import socketService from '../services/socketService';
import { addNotification } from '../store/slices/uiSlice';
import { updateDraft } from '../store/slices/draftSlice';

/**
 * Custom Hook useSocket
 * Quản lý WebSocket connection và events
 */
export const useSocket = (options = {}) => {
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.token);
  const {
    autoConnect = true,
    onConnect = null,
    onDisconnect = null,
    onError = null,
  } = options;

  /**
   * Connect/Disconnect based on token
   */
  useEffect(() => {
    if (autoConnect && token) {
      socketService.connect(token);

      // Setup event listeners
      socketService.on('connect', () => {
        console.log('✅ Socket kết nối');
        if (onConnect) onConnect();
      });

      socketService.on('disconnect', ({ reason }) => {
        console.log('❌ Socket ngắt kết nối:', reason);
        if (onDisconnect) onDisconnect(reason);
      });

      socketService.on('error', (error) => {
        console.error('❌ Socket lỗi:', error);
        if (onError) onError(error);
      });

      // Listen for notifications
      socketService.on('notification:new', (notification) => {
        dispatch(addNotification({
          message: notification.message,
          type: notification.type || 'info',
        }));
      });

      // Listen for draft updates
      socketService.on('draft:updated', (draft) => {
        dispatch(updateDraft(draft));
      });

      return () => {
        // Cleanup (nên giữ connection cho real-time)
        // socketService.disconnect();
      };
    }
  }, [token, autoConnect, dispatch, onConnect, onDisconnect, onError]);

  return socketService;
};

/**
 * Hook để sử dụng comment events
 */
export const useCommentSocket = (draftId) => {
  const socket = useSocket();

  useEffect(() => {
    if (socket.isConnected()) {
      socket.joinRoom(`draft:${draftId}`);

      return () => {
        socket.leaveRoom(`draft:${draftId}`);
      };
    }
  }, [socket, draftId]);

  return socket;
};

/**
 * Hook để sử dụng collaboration events
 */
export const useCollaborationSocket = (draftId) => {
  const socket = useSocket();
  const dispatch = useDispatch();

  useEffect(() => {
    if (socket.isConnected()) {
      socket.joinRoom(`collaboration:${draftId}`);

      // Listen for collaboration updates
      socket.on('collab:updated', (update) => {
        dispatch(addNotification({
          message: `${update.user_name} đã cập nhật: ${update.action}`,
          type: 'info',
        }));
      });

      return () => {
        socket.leaveRoom(`collaboration:${draftId}`);
      };
    }
  }, [socket, draftId, dispatch]);

  return socket;
};

export default useSocket;
