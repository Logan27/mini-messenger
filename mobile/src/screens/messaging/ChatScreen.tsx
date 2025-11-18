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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMessagingStore } from '../../stores/messagingStore';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCallStore } from '../../stores/callStore';
import { useContactStore } from '../../stores/contactStore';
import { Message, Conversation } from '../../types';
import { wsService, fileAPI } from '../../services/api';
import MessageActionsSheet from '../../components/messaging/MessageActionsSheet';
import MessageStatusIndicator, { MessageStatus } from '../../components/messaging/MessageStatusIndicator';
import FileAttachmentPicker from '../../components/messaging/FileAttachmentPicker';
import ImageViewerModal from '../../components/messaging/ImageViewerModal';
import TypingIndicator from '../../components/messaging/TypingIndicator';
import OnlineStatusBadge from '../../components/common/OnlineStatusBadge';
import ReactionPicker from '../../components/messaging/ReactionPicker';
import WhoReactedModal from '../../components/messaging/WhoReactedModal';
import LinkPreview from '../../components/messaging/LinkPreview';
import { extractFirstUrl, fetchLinkMetadata, containsUrl } from '../../utils/linkPreview';
import { saveDraft, loadDraft, clearDraft } from '../../utils/draftMessages';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const { user } = useAuthStore();
  const { privacy, theme } = useSettingsStore();
  const {
    conversations,
    messages,
    activeConversation,
    isLoading,
    error,
    loadMessages,
    loadOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    setTyping,
    typingUsers,
    addReaction,
    removeReaction,
  } = useMessagingStore();
  const { contacts, blockContact, muteContact, unmuteContact } = useContactStore();

  // Theme colors
  const isDark = theme === 'dark';
  const colors = {
    background: isDark ? '#000000' : '#ffffff',
    card: isDark ? '#1a1a1a' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: '#2563eb',
    accent: isDark ? '#1f2937' : '#f3f4f6',
    messageBg: isDark ? '#1f2937' : '#f1f5f9',
    searchBg: isDark ? '#1f2937' : '#f9fafb',
    inputBg: isDark ? '#374151' : '#ffffff',
    placeholder: isDark ? '#6b7280' : '#9ca3af',
  };

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTypingLocal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewingImageUri, setViewingImageUri] = useState<string>('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionTargetMessage, setReactionTargetMessage] = useState<Message | null>(null);
  const [showWhoReacted, setShowWhoReacted] = useState(false);
  const [whoReactedMessage, setWhoReactedMessage] = useState<Message | null>(null);
  const [linkPreviewsLoading, setLinkPreviewsLoading] = useState<Set<string>>(new Set());

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hasLoadedDraft = useRef(false);
  const savedScrollPosition = useRef<string | null>(null);
  const shouldRestoreScroll = useRef(false);
  const currentVisibleMessageId = useRef<string | null>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    waitForInteraction: false,
  }).current;

  const conversation = conversations?.find(c => c.id === conversationId);
  const conversationMessages = messages?.[conversationId] || [];

  useEffect(() => {
    const initializeConversation = async () => {
      if (conversationId) {
        // Load saved scroll position before loading messages
        const savedPosition = await AsyncStorage.getItem(`scroll_${conversationId}`);
        if (savedPosition) {
          savedScrollPosition.current = savedPosition;
          shouldRestoreScroll.current = true;
        }

        await loadMessages(conversationId);
        // Reset pagination state for new conversation
        setCurrentPage(1);
        setHasMoreMessages(true);
      }
    };

    initializeConversation();
  }, [conversationId, loadMessages]);

  useEffect(() => {
    // Load draft message for this conversation (only once on mount)
    const loadDraftMessage = async () => {
      if (!hasLoadedDraft.current) {
        const draft = await loadDraft(conversationId);
        if (draft && !editingMessage) {
          setMessageText(draft);
        }
        hasLoadedDraft.current = true;
      }
    };
    loadDraftMessage();
  }, [conversationId]);

  useEffect(() => {
    // Join conversation for real-time updates
    wsService.emit('joinConversation', conversationId);

    return () => {
      wsService.emit('leaveConversation', conversationId);

      // Save scroll position when leaving conversation
      if (currentVisibleMessageId.current) {
        AsyncStorage.setItem(`scroll_${conversationId}`, currentVisibleMessageId.current);
      }
    };
  }, [conversationId, conversationMessages]);

  // Restore scroll position after messages are loaded
  useEffect(() => {
    if (shouldRestoreScroll.current && conversationMessages.length > 0 && savedScrollPosition.current) {
      const messageIndex = conversationMessages.findIndex(m => m.id === savedScrollPosition.current);
      if (messageIndex !== -1) {
        // Small delay to ensure FlatList is ready
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: messageIndex,
            animated: false,
            viewPosition: 0.5, // Center the message
          });
          shouldRestoreScroll.current = false;
          savedScrollPosition.current = null;
        }, 100);
      }
    }
  }, [conversationMessages]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive (but not when loading more)
    if (conversationMessages.length > 0 && !isLoadingMore) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversationMessages]);

  useEffect(() => {
    // Auto-fetch link previews for text messages with URLs
    const fetchLinkPreviews = async () => {
      for (const message of conversationMessages) {
        // Only process text messages without existing previews
        if (
          message.type === 'text' &&
          !message.linkPreview &&
          !linkPreviewsLoading.has(message.id) &&
          containsUrl(message.content)
        ) {
          const url = extractFirstUrl(message.content);
          if (url) {
            // Mark as loading
            setLinkPreviewsLoading(prev => new Set([...prev, message.id]));

            try {
              const metadata = await fetchLinkMetadata(url);
              if (metadata) {
                // Update message with link preview
                // This would normally be done through the store
                // For now, we'll just remove from loading state
                // TODO: Add updateMessage with linkPreview to messaging store
              }
            } catch (error) {
              console.error('Failed to fetch link preview:', error);
            } finally {
              // Remove from loading state
              setLinkPreviewsLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(message.id);
                return newSet;
              });
            }
          }
        }
      }
    };

    fetchLinkPreviews();
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

      // Clear draft message
      await clearDraft(conversationId);

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

    // Set new timeout to stop typing indicator and save draft
    if (text) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTypingLocal(false);
        setTyping(conversationId, user!.id, false);
        // Save draft after user stops typing
        saveDraft(conversationId, text);
      }, 1000);
    } else {
      setIsTypingLocal(false);
      setTyping(conversationId, user!.id, false);
      // Clear draft if text is empty
      clearDraft(conversationId);
    }
  }, [conversationId, setTyping, user, isTyping]);

  // Automatically mark messages as read when they become visible
  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    // Track the first visible message for scroll position restoration
    if (viewableItems.length > 0) {
      const firstVisible: any = viewableItems[0];
      if (firstVisible?.item?.id) {
        currentVisibleMessageId.current = firstVisible.item.id;
      }
    }

    if (!privacy.showReadReceipts || !user) return;

    viewableItems.forEach((viewable: any) => {
      const message: Message = viewable.item;
      // Mark as read if it's not from current user and not already read
      if (message && !message.isRead && message.senderId !== user.id) {
        markAsRead(conversationId, message.id);
      }
    });
  }, [conversationId, markAsRead, user, privacy.showReadReceipts]);

  const handleMessagePress = useCallback((message: Message) => {
    // Keep this for additional tap-to-mark-read behavior if needed
  }, []);

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
      setShowAttachmentPicker(false);

      // Upload file to server
      const uploadResponse = await fileAPI.uploadFile(file, conversationId);
      const uploadedFile = uploadResponse.data.data;

      // Send message with file attachment
      await sendMessage(
        conversationId,
        file.type === 'image' ? '📷 Photo' : file.type === 'video' ? '🎥 Video' : `📎 ${file.name}`,
        undefined,
        uploadedFile
      );
    } catch (error) {
      console.error('File upload error:', error);
      Alert.alert('Error', 'Failed to send file. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [conversationId, sendMessage]);

  const handleImagePress = useCallback((imageUri: string) => {
    setViewingImageUri(imageUri);
    setShowImageViewer(true);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await loadOlderMessages(conversationId, nextPage);

      setCurrentPage(nextPage);
      setHasMoreMessages(result.hasMore);

      if (result.messages.length === 0) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Load more messages error:', error);
      setHasMoreMessages(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, currentPage, isLoadingMore, hasMoreMessages, loadOlderMessages]);

  const handleSearchToggle = useCallback(() => {
    setShowSearch(!showSearch);
    if (showSearch) {
      // Clear search when closing
      setSearchQuery('');
      setSearchResults([]);
      setCurrentSearchIndex(0);
    }
  }, [showSearch]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    // Filter messages that contain the search query (case-insensitive)
    const results = conversationMessages.filter(msg =>
      msg.type === 'text' && msg.content.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(results);
    setCurrentSearchIndex(0);

    // Scroll to first result if exists
    if (results.length > 0) {
      const firstResultIndex = conversationMessages.findIndex(m => m.id === results[0].id);
      if (firstResultIndex !== -1) {
        flatListRef.current?.scrollToIndex({ index: firstResultIndex, animated: true });
      }
    }
  }, [conversationMessages]);

  const handleSearchNavigate = useCallback((direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;

    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    }

    setCurrentSearchIndex(newIndex);

    // Scroll to the result
    const messageIndex = conversationMessages.findIndex(m => m.id === searchResults[newIndex].id);
    if (messageIndex !== -1) {
      flatListRef.current?.scrollToIndex({ index: messageIndex, animated: true });
    }
  }, [searchResults, currentSearchIndex, conversationMessages]);

  const handleOpenReactionPicker = useCallback((message: Message) => {
    setReactionTargetMessage(message);
    setShowReactionPicker(true);
    setShowActionsModal(false);
  }, []);

  const handleSelectReaction = useCallback(async (emoji: string) => {
    if (!reactionTargetMessage) return;

    const existingReaction = reactionTargetMessage.reactions?.find(r => r.emoji === emoji);
    const userHasReacted = existingReaction?.users.includes(user!.id);

    if (userHasReacted) {
      // Remove reaction if user already reacted with this emoji
      await removeReaction(conversationId, reactionTargetMessage.id, emoji);
    } else {
      // Add reaction
      await addReaction(conversationId, reactionTargetMessage.id, emoji);
    }
  }, [conversationId, reactionTargetMessage, user, addReaction, removeReaction]);

  const handleToggleReaction = useCallback(async (message: Message, emoji: string) => {
    const existingReaction = message.reactions?.find(r => r.emoji === emoji);
    const userHasReacted = existingReaction?.users.includes(user!.id);

    if (userHasReacted) {
      await removeReaction(conversationId, message.id, emoji);
    } else {
      await addReaction(conversationId, message.id, emoji);
    }
  }, [conversationId, user, addReaction, removeReaction]);

  const handleShowWhoReacted = useCallback((message: Message) => {
    setWhoReactedMessage(message);
    setShowWhoReacted(true);
  }, []);

  const { initiateCall } = useCallStore();

  const handleVoiceCall = useCallback(async () => {
    if (!conversation || conversation.type !== 'direct') {
      Alert.alert('Error', 'Voice calls are only available in direct conversations');
      return;
    }

    const otherUser = conversation.participants?.find(p => p.id !== user?.id);
    if (!otherUser) {
      Alert.alert('Error', 'Unable to find recipient');
      return;
    }

    try {
      const call = await initiateCall(otherUser.id, 'audio');
      navigation.navigate('OutgoingCall', { call });
    } catch (error) {
      console.error('Failed to initiate voice call:', error);
      Alert.alert('Error', 'Failed to initiate voice call');
    }
  }, [conversation, user, initiateCall, navigation]);

  const handleVideoCall = useCallback(async () => {
    if (!conversation || conversation.type !== 'direct') {
      Alert.alert('Error', 'Video calls are only available in direct conversations');
      return;
    }

    const otherUser = conversation.participants?.find(p => p.id !== user?.id);
    if (!otherUser) {
      Alert.alert('Error', 'Unable to find recipient');
      return;
    }

    try {
      const call = await initiateCall(otherUser.id, 'video');
      navigation.navigate('OutgoingCall', { call });
    } catch (error) {
      console.error('Failed to initiate video call:', error);
      Alert.alert('Error', 'Failed to initiate video call');
    }
  }, [conversation, user, initiateCall, navigation]);

  const getUserName = useCallback((userId: string) => {
    if (userId === user?.id) return 'You';
    const participant = conversation?.participants.find(p => p.id === userId);
    return participant?.name || 'Unknown User';
  }, [user, conversation]);

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
      ? conversation?.participants?.find(p => p.id === message.senderId)
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
              <Ionicons name="person" size={16} color={colors.textSecondary} />
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
          {message.type === 'image' ? (
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={() => message.file?.url && handleImagePress(message.file.url)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: message.file?.url }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : message.type === 'video' ? (
            <TouchableOpacity style={styles.imageContainer} activeOpacity={0.9}>
              <Image
                source={{ uri: message.file?.url }}
                style={styles.messageImage}
                resizeMode="cover"
              />
              <View style={styles.videoOverlay}>
                <Ionicons name="play-circle" size={48} color="#fff" />
              </View>
            </TouchableOpacity>
          ) : message.type === 'file' ? (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}>
              📎 {message.content || 'File'}
            </Text>
          ) : message.type === 'voice' ? (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}>
              🎵 Voice message
            </Text>
          ) : message.type === 'system' ? (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
              { fontStyle: 'italic', opacity: 0.7 }
            ]}>
              {message.content}
            </Text>
          ) : (
            <>
              <Text style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText,
              ]}>
                {message.content}
              </Text>
              {/* Link Preview */}
              {message.linkPreview && (
                <LinkPreview
                  metadata={message.linkPreview}
                  isLoading={linkPreviewsLoading.has(message.id)}
                />
              )}
            </>
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

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              {message.reactions.map((reaction) => {
                const userHasReacted = reaction.users.includes(user!.id);
                return (
                  <TouchableOpacity
                    key={`${message.id}-${reaction.emoji}`}
                    style={[
                      styles.reactionBubble,
                      userHasReacted && styles.reactionBubbleActive,
                    ]}
                    onPress={() => handleToggleReaction(message, reaction.emoji)}
                    onLongPress={() => handleShowWhoReacted(message)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                    <Text style={[
                      styles.reactionCount,
                      userHasReacted && styles.reactionCountActive,
                    ]}>
                      {reaction.users.length}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.addReactionButton}
                onPress={() => handleOpenReactionPicker(message)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Add reaction button for messages without reactions */}
        {(!message.reactions || message.reactions.length === 0) && (
          <TouchableOpacity
            style={styles.addReactionIcon}
            onPress={() => handleOpenReactionPicker(message)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderTypingIndicator = () => {
    const typingUserIds = typingUsers[conversationId] || [];
    const otherTypingUsers = typingUserIds.filter(id => id !== user?.id);

    if (otherTypingUsers.length === 0) return null;

    // Get names of typing users
    const typingUserNames = otherTypingUsers
      .map(id => conversation?.participants?.find(p => p.id === id)?.name)
      .filter(Boolean);

    const typingText = typingUserNames.length === 1
      ? `${typingUserNames[0]} is typing`
      : typingUserNames.length === 2
      ? `${typingUserNames[0]} and ${typingUserNames[1]} are typing`
      : `${typingUserNames.length} people are typing`;

    return (
      <View key="typing-indicator-footer" style={[styles.messageContainer, styles.otherMessage]}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={16} color={colors.textSecondary} />
          </View>
        </View>
        <View style={[styles.messageBubble, styles.otherBubble, styles.typingBubble]}>
          <Text style={styles.typingText}>{typingText}</Text>
          <TypingIndicator color={colors.textSecondary} dotSize={6} />
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (isLoadingMore) {
      return (
        <View key="load-more-header" style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        {/* Avatar */}
        {(() => {
          const otherUser = conversation.type === 'direct'
            ? conversation.participants?.find(p => p.id !== user?.id)
            : null;
          const avatarUri = conversation.type === 'group'
            ? conversation.avatar
            : (otherUser?.avatar || otherUser?.profilePicture);

          return avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder, { backgroundColor: colors.accent }]}>
              <Ionicons
                name={conversation.type === 'group' ? 'people' : 'person'}
                size={20}
                color={colors.textSecondary}
              />
            </View>
          );
        })()}

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
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {(() => {
                if (conversation.type === 'group') {
                  return conversation.name || 'Group Chat';
                }
                const otherUser = conversation.participants?.find(p => p.id !== user?.id);
                return otherUser?.name || otherUser?.username || 'Chat';
              })()}
            </Text>
            {conversation.type === 'group' && (
              <Ionicons name="people" size={16} color={colors.textSecondary} style={styles.groupIcon} />
            )}
            {conversation.type === 'direct' && (() => {
              const otherUser = conversation.participants?.find(p => p.id !== user?.id);
              return otherUser?.isOnline && (
                <OnlineStatusBadge isOnline={true} size={10} style={styles.onlineBadge} />
              );
            })()}
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {(() => {
              const typingUserIds = typingUsers[conversationId] || [];
              const otherTypingUsers = typingUserIds.filter(id => id !== user?.id);

              if (otherTypingUsers.length > 0) {
                return 'typing...';
              }

              if (conversation.type === 'direct') {
                const otherUser = conversation.participants?.find(p => p.id !== user?.id);
                return otherUser?.isOnline ? 'online' : 'offline';
              }

              return `${conversation.participants?.length || 0} participants`;
            })()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton} onPress={handleSearchToggle}>
          <Ionicons name="search" size={24} color={colors.primary} />
        </TouchableOpacity>
        {conversation.type === 'direct' && (
          <>
            <TouchableOpacity style={styles.headerButton} onPress={handleVoiceCall}>
              <Ionicons name="call" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleVideoCall}>
              <Ionicons name="videocam" size={24} color={colors.primary} />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            const otherUser = conversation.type === 'direct'
              ? conversation.participants?.find(p => p.id !== user?.id)
              : null;

            const contact = otherUser
              ? contacts.find(c => c.user?.id === otherUser.id || c.userId === otherUser.id)
              : null;

            const isMuted = contact?.isMuted || false;

            // Show options menu
            Alert.alert(
              'Options',
              '',
              [
                conversation.type === 'direct' && {
                  text: 'View Contact',
                  onPress: () => {
                    if (otherUser) {
                      navigation.navigate('ContactProfile', { userId: otherUser.id });
                    }
                  }
                },
                conversation.type === 'group' && {
                  text: 'Group Info',
                  onPress: () => navigation.navigate('GroupInfo', { groupId: conversation.id })
                },
                {
                  text: isMuted ? 'Unmute Notifications' : 'Mute Notifications',
                  onPress: async () => {
                    if (!contact) {
                      Alert.alert('Error', 'Contact not found');
                      return;
                    }
                    try {
                      if (isMuted) {
                        await unmuteContact(contact.id);
                        Alert.alert('Success', 'Notifications unmuted');
                      } else {
                        await muteContact(contact.id);
                        Alert.alert('Success', 'Notifications muted');
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to update notification settings');
                    }
                  }
                },
                conversation.type === 'direct' && {
                  text: 'Block User',
                  style: 'destructive',
                  onPress: () => {
                    if (!contact) {
                      Alert.alert('Error', 'Contact not found');
                      return;
                    }
                    Alert.alert(
                      'Block User',
                      'Are you sure you want to block this user? They will not be able to contact you.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Block',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await blockContact(contact.id);
                              Alert.alert('Blocked', 'User has been blocked');
                              navigation.goBack();
                            } catch (error) {
                              Alert.alert('Error', 'Failed to block user');
                            }
                          }
                        }
                      ]
                    );
                  }
                },
                {
                  text: 'Delete Chat',
                  style: 'destructive',
                  onPress: () => {
                    Alert.alert(
                      'Delete Chat',
                      'Are you sure you want to delete this chat? This action cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            // Delete all messages in conversation
                            const conversationMessages = messages[conversationId] || [];
                            try {
                              for (const msg of conversationMessages) {
                                await deleteMessage(conversationId, msg.id, false);
                              }
                              Alert.alert('Deleted', 'Chat has been deleted');
                              navigation.goBack();
                            } catch (error) {
                              Alert.alert('Error', 'Failed to delete chat');
                            }
                          }
                        }
                      ]
                    );
                  }
                },
                { text: 'Cancel', style: 'cancel' }
              ].filter(Boolean) as any
            );
          }}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.searchBg, borderBottomColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            placeholder="Search messages..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <>
              <Text style={styles.searchCount}>
                {searchResults.length > 0
                  ? `${currentSearchIndex + 1}/${searchResults.length}`
                  : '0'}
              </Text>
              <TouchableOpacity
                style={styles.searchNavButton}
                onPress={() => handleSearchNavigate('prev')}
                disabled={searchResults.length === 0}
              >
                <Ionicons name="chevron-up" size={20} color={searchResults.length > 0 ? "#2563eb" : "#ccc"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.searchNavButton}
                onPress={() => handleSearchNavigate('next')}
                disabled={searchResults.length === 0}
              >
                <Ionicons name="chevron-down" size={20} color={searchResults.length > 0 ? "#2563eb" : "#ccc"} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.searchCloseButton} onPress={handleSearchToggle}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

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
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={styles.editBarText}>Editing message</Text>
          </View>
          <TouchableOpacity onPress={handleCancelEdit}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setShowAttachmentPicker(true)}
        >
          <Ionicons name="add" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder={editingMessage ? "Edit message..." : "Type a message..."}
          value={messageText}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
          textAlignVertical="top"
          scrollEnabled
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
            <Ionicons name="mic" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        </View>
      </KeyboardAvoidingView>

      {/* Message Actions Sheet */}
      <MessageActionsSheet
        visible={showActionsModal}
        message={selectedMessage}
        isOwnMessage={selectedMessage?.senderId === user?.id}
        onClose={() => setShowActionsModal(false)}
        onEdit={selectedMessage ? () => handleEditMessage(selectedMessage) : undefined}
        onDelete={(deleteForEveryone) => selectedMessage && handleDeleteMessage(selectedMessage, deleteForEveryone)}
        onReply={() => selectedMessage && handleReplyMessage(selectedMessage)}
        onCopy={() => selectedMessage && handleCopyMessage(selectedMessage)}
        onReact={() => selectedMessage && handleOpenReactionPicker(selectedMessage)}
      />

      {/* File Attachment Picker */}
      <FileAttachmentPicker
        visible={showAttachmentPicker}
        onClose={() => setShowAttachmentPicker(false)}
        onFileSelected={handleFileSelected}
      />

      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={showImageViewer}
        imageUri={viewingImageUri}
        onClose={() => setShowImageViewer(false)}
      />

      {/* Reaction Picker */}
      <ReactionPicker
        visible={showReactionPicker}
        onClose={() => setShowReactionPicker(false)}
        onSelectReaction={handleSelectReaction}
      />

      {/* Who Reacted Modal */}
      <WhoReactedModal
        visible={showWhoReacted}
        onClose={() => setShowWhoReacted(false)}
        reactions={whoReactedMessage?.reactions || []}
        getUserName={getUserName}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
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
  },
  backButton: {
    marginRight: 15,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  groupIcon: {
    marginLeft: 6,
  },
  onlineBadge: {
    marginLeft: 6,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  headerButton: {
    marginLeft: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchCount: {
    fontSize: 13,
    marginLeft: 10,
    minWidth: 50,
    textAlign: 'center',
  },
  searchNavButton: {
    padding: 4,
    marginLeft: 4,
  },
  searchCloseButton: {
    padding: 4,
    marginLeft: 8,
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
    backgroundColor: '#e5e7eb',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
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
    position: 'relative',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
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
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reactionBubbleActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  reactionCountActive: {
    color: '#2563eb',
  },
  addReactionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addReactionIcon: {
    marginLeft: 8,
    opacity: 0.6,
  },
});

export default ChatScreen;
