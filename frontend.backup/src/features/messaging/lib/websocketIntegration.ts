import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/app/stores/authStore'
import { useMessageStore } from '@/app/stores/messageStore'
import websocketService from '@/services/websocketService'

export const useWebSocketIntegration = () => {
  const { user, token } = useAuthStore()
  const messageStore = useMessageStore()
  const initialized = useRef(false)

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (user && token && !initialized.current) {
      console.log('🔌 Initializing WebSocket connection for messaging')

      // Connect to WebSocket
      websocketService.connect(token, user.id, user.name)

      // Set up event listeners
      setupWebSocketEventListeners()

      initialized.current = true
    }

    // Cleanup on unmount
    return () => {
      if (initialized.current) {
        console.log('🔌 Cleaning up WebSocket connection')
        websocketService.cleanup()
        initialized.current = false
      }
    }
  }, [user, token])

  const setupWebSocketEventListeners = () => {
    // Message events
    websocketService.on('message_sent', (data) => {
      console.log('📨 Message sent:', data)
      messageStore.handleNewMessage(data.message)
    })

    websocketService.on('message_delivered', (data) => {
      console.log('📬 Message delivered:', data)
      messageStore.handleMessageStatus({
        messageId: data.messageId,
        status: 'delivered',
        userId: data.userId
      })
    })

    websocketService.on('message_read', (data) => {
      console.log('👁️ Message read:', data)
      messageStore.handleMessageStatus({
        messageId: data.messageId,
        status: 'read',
        userId: data.userId
      })
    })

    // Typing events
    websocketService.on('typing', (data) => {
      console.log('⌨️ User typing:', data)
      messageStore.handleTyping({
        conversationId: data.conversationId,
        userId: data.userId,
        isTyping: true
      })
    })

    websocketService.on('stop_typing', (data) => {
      console.log('🛑 User stopped typing:', data)
      messageStore.handleTyping({
        conversationId: data.conversationId,
        userId: data.userId,
        isTyping: false
      })
    })

    // User presence events
    websocketService.on('user_online', (data) => {
      console.log('🟢 User online:', data)
      // Update user online status in conversations
    })

    websocketService.on('user_offline', (data) => {
      console.log('🔴 User offline:', data)
      // Update user offline status in conversations
    })

    // Connection events
    websocketService.on('connected', (data) => {
      console.log('✅ WebSocket connected:', data)
    })

    websocketService.on('disconnected', (data) => {
      console.log('❌ WebSocket disconnected:', data)
    })

    websocketService.on('error', (data) => {
      console.error('🚨 WebSocket error:', data)
    })

    websocketService.on('reconnected', (data) => {
      console.log('🔄 WebSocket reconnected:', data)
      // Reload conversations on reconnection
      messageStore.loadConversations()
    })
  }

  // Helper functions for sending WebSocket events
  const sendMessage = (conversationId: string, content: string, type: 'text' | 'file' | 'image' = 'text') => {
    websocketService.sendMessage({
      conversationId,
      content,
      type,
      timestamp: new Date().toISOString()
    })
  }

  const sendTypingIndicator = (conversationId: string, isTyping: boolean) => {
    websocketService.sendMessage({
      type: isTyping ? 'typing' : 'stop_typing',
      conversationId,
      userId: user?.id,
      timestamp: new Date().toISOString()
    })
  }

  const joinConversation = (conversationId: string) => {
    websocketService.sendMessage({
      type: 'join_conversation',
      conversationId,
      timestamp: new Date().toISOString()
    })
  }

  const leaveConversation = (conversationId: string) => {
    websocketService.sendMessage({
      type: 'leave_conversation',
      conversationId,
      timestamp: new Date().toISOString()
    })
  }

  const markMessageAsRead = (messageId: string) => {
    websocketService.sendMessage({
      type: 'mark_as_read',
      messageId,
      timestamp: new Date().toISOString()
    })
  }

  return {
    isConnected: websocketService.getConnectionState().isConnected,
    connectionState: websocketService.getConnectionState().connectionState,
    sendMessage,
    sendTypingIndicator,
    joinConversation,
    leaveConversation,
    markMessageAsRead
  }
}