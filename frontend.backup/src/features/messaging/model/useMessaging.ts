import { useCallback } from 'react'
import { useMessageStore } from '@/app/stores/messageStore'
import { messagingApi } from '../api/messagingApi'

export const useMessaging = () => {
  const store = useMessageStore()

  const loadConversations = useCallback(async () => {
    try {
      const conversations = await messagingApi.getConversations()
      // The store will be updated via WebSocket events or direct API calls
      // For now, we'll use the existing store method
      await store.loadConversations()
    } catch (error) {
      console.error('Failed to load conversations:', error)
      throw error
    }
  }, [store])

  const loadMessages = useCallback(async (conversationId: string, page?: number) => {
    try {
      await store.loadMessages(conversationId, page)
    } catch (error) {
      console.error('Failed to load messages:', error)
      throw error
    }
  }, [store])

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    type?: 'text' | 'file' | 'image'
  ) => {
    try {
      return await store.sendMessage(conversationId, content, type)
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }, [store])

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await store.markAsRead(messageId)
    } catch (error) {
      console.error('Failed to mark message as read:', error)
      throw error
    }
  }, [store])

  const deleteMessage = useCallback(async (messageId: string, deleteForEveryone?: boolean) => {
    try {
      await store.deleteMessage(messageId, deleteForEveryone)
    } catch (error) {
      console.error('Failed to delete message:', error)
      throw error
    }
  }, [store])

  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await store.editMessage(messageId, content)
    } catch (error) {
      console.error('Failed to edit message:', error)
      throw error
    }
  }, [store])

  const setTyping = useCallback((conversationId: string, isTyping: boolean) => {
    store.setTyping(conversationId, isTyping)
  }, [store])

  const joinConversation = useCallback((conversationId: string) => {
    store.joinConversation(conversationId)
  }, [store])

  const leaveConversation = useCallback((conversationId: string) => {
    store.leaveConversation(conversationId)
  }, [store])

  return {
    // State
    conversations: store.conversations,
    currentConversationId: store.currentConversationId,
    messages: store.messages,
    isLoading: store.isLoading,
    error: store.error,
    hasMoreMessages: store.hasMoreMessages,
    typingUsers: store.typingUsers,

    // Actions
    loadConversations,
    loadMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
    editMessage,
    setTyping,
    joinConversation,
    leaveConversation,

    // Real-time handlers
    handleWebSocketMessage: store.handleWebSocketMessage,
    handleNewMessage: store.handleNewMessage,
    handleMessageStatus: store.handleMessageStatus,
    handleTyping: store.handleTyping,
    handleUserJoined: store.handleUserJoined,
    handleUserLeft: store.handleUserLeft,
  }
}