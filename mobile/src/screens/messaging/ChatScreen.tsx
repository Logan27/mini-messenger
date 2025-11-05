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
import { useSettingsStore } from '../../stores/settingsStore';
import { useCallStore } from '../../stores/callStore';
import { Message, Conversation } from '../../types';
import { wsService } from '../../services/api';
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
  const { privacy } = useSettingsStore();
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
    addReaction,
    removeReaction,
  } = useMessagingStore();

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

  const conversation = conversations.find(c => c.id === conversationId);
  const conversationMessages = messages[conversationId] || [];

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    }
  }, [conversationId, loadMessages]);

  useEffect(() => {
    // Load draft message for this conversation
    const loadDraftMessage = async () => {
      const draft = await loadDraft(conversationId);
      if (draft && !editingMessage) {
        setMessageText(draft);
      }
    };
    loadDraftMessage();
  }, [conversationId]);

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

  const handleMessagePress = useCallback((message: Message) => {
    // Mark message as read (only if read receipts are enabled)
    if (!message.isRead && message.senderId !== user?.id && privacy.showReadReceipts) {
      markAsRead(conversationId, message.id);
    }
  }, [conversationId, markAsRead, user, privacy.showReadReceipts]);

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
      const { fileAPI } = await import('../../services/api');
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

    const otherUser = conversation.participants.find(p => p.id !== user?.id);
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

    const otherUser = conversation.participants.find(p => p.id !== user?.id);
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
          ) : message.type === 'image' ? (
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

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              {message.reactions.map((reaction, index) => {
                const userHasReacted = reaction.users.includes(user!.id);
                return (
                  <TouchableOpacity
                    key={index}
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
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderTypingIndicator = () => {
    const typingUserIds = typingUsers[conversationId] || [];
    const otherTypingUsers = typingUserIds.filter(id => id !== user?.id);

    if (otherTypingUsers.length === 0) return null;

    // Get names of typing users
    const typingUserNames = otherTypingUsers
      .map(id => conversation?.participants.find(p => p.id === id)?.name)
      .filter(Boolean);

    const typingText = typingUserNames.length === 1
      ? `${typingUserNames[0]} is typing`
      : typingUserNames.length === 2
      ? `${typingUserNames[0]} and ${typingUserNames[1]} are typing`
      : `${typingUserNames.length} people are typing`;

    return (
      <View style={[styles.messageContainer, styles.otherMessage]}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={16} color="#666" />
          </View>
        </View>
        <View style={[styles.messageBubble, styles.otherBubble, styles.typingBubble]}>
          <Text style={styles.typingText}>{typingText}</Text>
          <TypingIndicator color="#666" dotSize={6} />
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
            {conversation.type === 'direct' && (() => {
              const otherUser = conversation.participants.find(p => p.id !== user?.id);
              return otherUser?.isOnline && (
                <OnlineStatusBadge isOnline={true} size={10} style={styles.onlineBadge} />
              );
            })()}
          </View>
          <Text style={styles.headerSubtitle}>
            {(() => {
              const typingUserIds = typingUsers[conversationId] || [];
              const otherTypingUsers = typingUserIds.filter(id => id !== user?.id);

              if (otherTypingUsers.length > 0) {
                return 'typing...';
              }

              if (conversation.type === 'direct') {
                const otherUser = conversation.participants.find(p => p.id !== user?.id);
                return otherUser?.isOnline ? 'online' : 'offline';
              }

              return `${conversation.participants.length} participants`;
            })()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton} onPress={handleSearchToggle}>
          <Ionicons name="search" size={24} color="#2563eb" />
        </TouchableOpacity>
        {conversation.type === 'direct' && (
          <>
            <TouchableOpacity style={styles.headerButton} onPress={handleVoiceCall}>
              <Ionicons name="call" size={24} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleVideoCall}>
              <Ionicons name="videocam" size={24} color="#2563eb" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
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
            <Ionicons name="close" size={20} color="#666" />
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
  onlineBadge: {
    marginLeft: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  headerButton: {
    marginLeft: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchCount: {
    fontSize: 13,
    color: '#666',
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
