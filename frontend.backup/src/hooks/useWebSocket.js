import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService.js';

// Custom hook for WebSocket connection management
export const useWebSocket = (token, userId, username) => {
  const [connectionState, setConnectionState] = useState(websocketService.getConnectionState());
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState(new Map());
  const [typingUsers, setTypingUsers] = useState(new Map());
  const reconnectTimeoutRef = useRef(null);

  // Update connection state when it changes
  useEffect(() => {
    const handleConnectionStateChange = ({ newState }) => {
      setConnectionState(websocketService.getConnectionState());
    };

    const handleMessageSent = (data) => {
      setMessages(prev => [...prev, { ...data, type: 'sent', timestamp: Date.now() }]);
    };

    const handleMessageDelivered = (data) => {
      setMessages(prev => prev.map(msg =>
        msg.id === data.messageId
          ? { ...msg, status: 'delivered', deliveredAt: data.timestamp }
          : msg
      ));
    };

    const handleMessageRead = (data) => {
      setMessages(prev => prev.map(msg =>
        msg.id === data.messageId
          ? { ...msg, status: 'read', readAt: data.timestamp }
          : msg
      ));
    };

    const handleGroupMessage = (data) => {
      setMessages(prev => [...prev, { ...data, type: 'group', timestamp: Date.now() }]);
    };

    const handleUserOnline = (data) => {
      setUsers(prev => new Map(prev).set(data.userId, { ...data, status: 'online' }));
    };

    const handleUserOffline = (data) => {
      setUsers(prev => new Map(prev).set(data.userId, { ...data, status: 'offline' }));
    };

    const handleUserStatusUpdate = (data) => {
      setUsers(prev => new Map(prev).set(data.userId, data));
    };

    const handleTyping = (data) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const key = data.groupId ? `group:${data.groupId}` : `user:${data.userId}`;
        if (!newMap.has(key)) {
          newMap.set(key, new Set());
        }
        newMap.get(key).add(data.userId);
        return newMap;
      });
    };

    const handleStopTyping = (data) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const key = data.groupId ? `group:${data.groupId}` : `user:${data.userId}`;
        if (newMap.has(key)) {
          newMap.get(key).delete(data.userId);
          if (newMap.get(key).size === 0) {
            newMap.delete(key);
          }
        }
        return newMap;
      });
    };

    const handleError = (error) => {
      console.error('WebSocket error:', error);
      setConnectionState(websocketService.getConnectionState());
    };

    // Subscribe to events
    websocketService.on('connection_state_change', handleConnectionStateChange);
    websocketService.on('message_sent', handleMessageSent);
    websocketService.on('message_delivered', handleMessageDelivered);
    websocketService.on('message_read', handleMessageRead);
    websocketService.on('group_message', handleGroupMessage);
    websocketService.on('user_online', handleUserOnline);
    websocketService.on('user_offline', handleUserOffline);
    websocketService.on('user_status_update', handleUserStatusUpdate);
    websocketService.on('typing', handleTyping);
    websocketService.on('stop_typing', handleStopTyping);
    websocketService.on('error', handleError);

    // Initialize connection state
    setConnectionState(websocketService.getConnectionState());

    // Cleanup function
    return () => {
      websocketService.off('connection_state_change', handleConnectionStateChange);
      websocketService.off('message_sent', handleMessageSent);
      websocketService.off('message_delivered', handleMessageDelivered);
      websocketService.off('message_read', handleMessageRead);
      websocketService.off('group_message', handleGroupMessage);
      websocketService.off('user_online', handleUserOnline);
      websocketService.off('user_offline', handleUserOffline);
      websocketService.off('user_status_update', handleUserStatusUpdate);
      websocketService.off('typing', handleTyping);
      websocketService.off('stop_typing', handleStopTyping);
      websocketService.off('error', handleError);
    };
  }, []);

  // Connect to WebSocket when token is available
  useEffect(() => {
    if (token && userId && username) {
      websocketService.connect(token, userId, username);
    }

    return () => {
      // Don't disconnect on cleanup if component unmounts but token still exists
      // The service will handle reconnection automatically
    };
  }, [token, userId, username]);

  // Send message function
  const sendMessage = useCallback((messageData, options = {}) => {
    return websocketService.sendMessage(messageData, options);
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((recipientId, groupId) => {
    if (!websocketService.socket || !websocketService.isConnected) return;

    websocketService.socket.emit('typing', { recipientId, groupId });
  }, []);

  // Stop typing indicator
  const stopTypingIndicator = useCallback((recipientId, groupId) => {
    if (!websocketService.socket || !websocketService.isConnected) return;

    websocketService.socket.emit('stop_typing', { recipientId, groupId });
  }, []);

  // Update user status
  const updateUserStatus = useCallback((status) => {
    if (!websocketService.socket || !websocketService.isConnected) return;

    websocketService.socket.emit('user_status_update', { status });
  }, []);

  // Send WebRTC signal
  const sendWebRTCSignal = useCallback((targetUserId, signal, type) => {
    if (!websocketService.socket || !websocketService.isConnected) return;

    websocketService.socket.emit('webrtc_signal', { targetUserId, signal, type });
  }, []);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    websocketService.disconnect();
    setTimeout(() => {
      if (token && userId && username) {
        websocketService.connect(token, userId, username);
      }
    }, 100);
  }, [token, userId, username]);

  // Get typing users for a conversation
  const getTypingUsers = useCallback((recipientId, groupId) => {
    const key = groupId ? `group:${groupId}` : `user:${recipientId}`;
    return typingUsers.get(key) || new Set();
  }, [typingUsers]);

  // Check if user is online
  const isUserOnline = useCallback((userId) => {
    const user = users.get(userId);
    return user && user.status === 'online';
  }, [users]);

  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isConnecting: connectionState.isConnecting,
    connectionState: connectionState.connectionState,
    reconnectAttempts: connectionState.reconnectAttempts,
    offlineQueueSize: connectionState.offlineQueueSize,

    // Data
    messages,
    users,
    typingUsers,

    // Actions
    sendMessage,
    sendTypingIndicator,
    stopTypingIndicator,
    updateUserStatus,
    sendWebRTCSignal,
    reconnect,

    // Utilities
    getTypingUsers,
    isUserOnline,

    // Raw service access for advanced usage
    websocketService
  };
};

export default useWebSocket;