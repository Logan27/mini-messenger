import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessagingStore } from '../../stores/messagingStore';
import { useAuthStore } from '../../stores/authStore';
import { Message, Conversation } from '../../types';
import { wsService } from '../../services/api';
import MessageActionsModal from '../../components/messaging/MessageActionsModal';
import MessageStatusIndicator, { MessageStatus } from '../../components/messaging/MessageStatusIndicator';
import FileAttachmentPicker from '../../components/messaging/FileAttachmentPicker';

interface ChatScreenProps {
  route: {
    params: {
      conversationId: string;
    };
  };
  navigation: any;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { conversationId } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    conversations,
    messages,
    activeConversation,
    isLoading,
    error,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    setTyping,
    typingUsers,
  } = useMessagingStore();

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTypingLocal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const conversation = conversations.find(c => c.id === conversationId);
  const conversationMessages = messages[conversationId] || [];

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    }
  }, [conversationId, loadMessages]);

  useEffect(() => {
    // Join conversation for real-time updates
    wsService.emit('joinConversation', conversationId);

    return () => {
      wsService.emit('leaveConversation', conversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive (but not when loading more)
    if (conversationMessages.length > 0 && !isLoadingMore) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversationMessages]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || isSending) return;

    const messageToSend = messageText.trim();
    const messageToEdit = editingMessage;
    const replyTo = replyToMessage;

    setIsSending(true);
    try {
      if (messageToEdit) {
        // Edit existing message
        await editMessage(conversationId, messageToEdit.id, messageToSend);
        setEditingMessage(null);
      } else {
        // Send new message
        await sendMessage(conversationId, messageToSend, replyTo?.id);
        setReplyToMessage(null);
      }

      setMessageText('');

      // Stop typing indicator
      if (isTyping) {
        setIsTypingLocal(false);
        setTyping(conversationId, user!.id, false);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        messageToEdit
          ? 'Failed to edit message. Please try again.'
          : 'Failed to send message. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  }, [messageText, isSending, conversationId, sendMessage, editMessage, setTyping, user, isTyping, editingMessage, replyToMessage]);

  const handleTextChange = useCallback((text: string) => {
    setMessageText(text);

    // Handle typing indicator
    if (text && !isTyping) {
      setIsTypingLocal(true);
      setTyping(conversationId, user!.id, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    if (text) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTypingLocal(false);
        setTyping(conversationId, user!.id, false);
      }, 1000);
    } else {
      setIsTypingLocal(false);
      setTyping(conversationId, user!.id, false);
    }
  }, [conversationId, setTyping, user, isTyping]);

  const handleMessagePress = useCallback((message: Message) => {
    // Mark message as read
    if (!message.isRead && message.senderId !== user?.id) {
      markAsRead(conversationId, message.id);
    }
  }, [conversationId, markAsRead, user]);

  const handleMessageLongPress = useCallback((message: Message) => {
    setSelectedMessage(message);
    setShowActionsModal(true);
  }, []);

  const handleEditMessage = useCallback((message: Message) => {
    setEditingMessage(message);
    setMessageText(message.content);
  }, []);

  const handleDeleteMessage = useCallback(async (message: Message, deleteForEveryone: boolean) => {
    Alert.alert(
      'Delete Message',
      deleteForEveryone
        ? 'This message will be deleted for everyone. This action cannot be undone.'
        : 'This message will be deleted for you only.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessage(conversationId, message.id, deleteForEveryone);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete message. Please try again.');
            }
          },
        },
      ]
    );
  }, [conversationId, deleteMessage]);

  const handleReplyMessage = useCallback((message: Message) => {
    setReplyToMessage(message);
  }, []);

  const handleCopyMessage = useCallback((message: Message) => {
    Clipboard.setString(message.content);
    Alert.alert('Copied', 'Message copied to clipboard');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setMessageText('');
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  const handleFileSelected = useCallback(async (file: any) => {
    try {
      setIsSending(true);
      // TODO: Implement file upload to server
      // For now, just show a placeholder
      await sendMessage(conversationId, `📎 ${file.name}`, undefined, file);
    } catch (error) {
      Alert.alert('Error', 'Failed to send file. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [conversationId, sendMessage]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    try {
      // TODO: Implement pagination
      // const olderMessages = await loadOlderMessages(conversationId, conversationMessages[0]?.id);
      // if (olderMessages.length === 0) {
      //   setHasMoreMessages(false);
      // }
    } catch (error) {
      console.error('Load more messages error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, conversationMessages, isLoadingMore, hasMoreMessages]);

  const getMessageStatus = (message: Message): MessageStatus => {
    if (message.senderId !== user?.id) return 'sent';

    // TODO: Implement proper status tracking
    if (message.isRead) return 'read';
    // if (message.isDelivered) return 'delivered';
    return 'sent';
  };

  const renderMessage = ({ item: message }: { item: Message }) => {
    const isMyMessage = message.senderId === user?.id;
    const showAvatar = !isMyMessage && message.type === 'text';
    const messageStatus = getMessageStatus(message);
    const isGroupChat = conversation?.type === 'group';

    // Find sender info for group chats
    const sender = !isMyMessage && isGroupChat
      ? conversation?.participants.find(p => p.id === message.senderId)
      : null;

    return (
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage,
        ]}
        onPress={() => handleMessagePress(message)}
        onLongPress={() => handleMessageLongPress(message)}
      >
        {showAvatar && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={16} color="#666" />
            </View>
          </View>
        )}

        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myBubble : styles.otherBubble,
        ]}>
          {/* Sender name for group chats */}
          {!isMyMessage && isGroupChat && sender && (
            <Text style={styles.senderName}>{sender.name}</Text>
          )}

          {/* Reply indicator */}
          {message.replyTo && (
            <View style={styles.replyContainer}>
              <View style={styles.replyBar} />
              <View style={styles.replyContent}>
                <Text style={styles.replyText} numberOfLines={1}>
                  Reply to message
                </Text>
              </View>
            </View>
          )}

          {/* Message content */}
          {message.type === 'text' ? (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}>
              {message.content}
            </Text>
          ) : message.type === 'image' ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: message.file?.url }} style={styles.messageImage} />
            </View>
          ) : (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}>
              {message.type === 'file' ? '📎 File' : '🎵 Voice message'}
            </Text>
          )}

          {/* Message footer */}
          <View style={styles.messageFooter}>
            {message.editedAt && (
              <Text style={[
                styles.editedText,
                isMyMessage ? styles.myEditedText : styles.otherEditedText,
              ]}>
                edited
              </Text>
            )}
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
            ]}>
              {formatMessageTime(message.createdAt)}
            </Text>
            {isMyMessage && (
              <MessageStatusIndicator
                status={messageStatus}
                color={isMyMessage ? 'rgba(255, 255, 255, 0.7)' : '#6b7280'}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderTypingIndicator = () => {
    const typingUserIds = typingUsers[conversationId] || [];
    const otherTypingUsers = typingUserIds.filter(id => id !== user?.id);

    if (otherTypingUsers.length === 0) return null;

    return (
      <View style={[styles.messageContainer, styles.otherMessage]}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={16} color="#666" />
          </View>
        </View>
        <View style={[styles.messageBubble, styles.otherBubble, styles.typingBubble]}>
          <Text style={[styles.messageText, styles.otherMessageText]}>
            Typing...
          </Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      );
    }
    return null;
  };

  if (!conversation) {
    return (
      <View style={styles.centerContainer}>
        <Text>Conversation not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => {
            if (conversation.type === 'group' && conversation.id) {
              navigation.navigate('GroupInfo', { groupId: conversation.id });
            }
          }}
          disabled={conversation.type !== 'group'}
        >
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {conversation.name || 'Chat'}
            </Text>
            {conversation.type === 'group' && (
              <Ionicons name="people" size={16} color="#666" style={styles.groupIcon} />
            )}
          </View>
          <Text style={styles.headerSubtitle}>
            {conversation.participants.length} participants
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="call" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderTypingIndicator}
        onContentSizeChange={() => !isLoadingMore && flatListRef.current?.scrollToEnd({ animated: true })}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      {/* Reply Bar */}
      {replyToMessage && (
        <View style={styles.replyInputBar}>
          <View style={styles.replyBarContent}>
            <Ionicons name="arrow-undo" size={20} color="#6b7280" />
            <View style={styles.replyBarText}>
              <Text style={styles.replyBarTitle}>Replying to</Text>
              <Text style={styles.replyBarMessage} numberOfLines={1}>
                {replyToMessage.content}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleCancelReply}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Bar */}
      {editingMessage && (
        <View style={styles.editBar}>
          <View style={styles.editBarContent}>
            <Ionicons name="create-outline" size={20} color="#2563eb" />
            <Text style={styles.editBarText}>Editing message</Text>
          </View>
          <TouchableOpacity onPress={handleCancelEdit}>
            <Ionicons name="close" size={24} color="#2563eb" />
          </TouchableOpacity>
        </View>
      )}

      {/* Message Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setShowAttachmentPicker(true)}
        >
          <Ionicons name="add" size={24} color="#666" />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder={editingMessage ? "Edit message..." : "Type a message..."}
          value={messageText}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
        />

        {messageText.trim() ? (
          <TouchableOpacity
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.micButton}>
            <Ionicons name="mic" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Message Actions Modal */}
      <MessageActionsModal
        visible={showActionsModal}
        message={selectedMessage}
        isMyMessage={selectedMessage?.senderId === user?.id}
        onClose={() => setShowActionsModal(false)}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onReply={handleReplyMessage}
        onCopy={handleCopyMessage}
      />

      {/* File Attachment Picker */}
      <FileAttachmentPicker
        visible={showAttachmentPicker}
        onClose={() => setShowAttachmentPicker(false)}
        onFileSelected={handleFileSelected}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  groupIcon: {
    marginLeft: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  headerButton: {
    marginLeft: 15,
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  loadMoreContainer: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  replyContainer: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 8,
  },
  replyBar: {
    width: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  editedText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginRight: 4,
  },
  myEditedText: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  otherEditedText: {
    color: '#9ca3af',
  },
  messageTime: {
    fontSize: 12,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#666',
  },
  imageContainer: {
    padding: 0,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  replyInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  replyBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  replyBarText: {
    marginLeft: 10,
    flex: 1,
  },
  replyBarTitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  replyBarMessage: {
    fontSize: 14,
    color: '#1f2937',
  },
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
  },
  editBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBarText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  attachButton: {
    marginRight: 10,
    padding: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  micButton: {
    padding: 8,
    marginLeft: 10,
  },
});

export default ChatScreen;
