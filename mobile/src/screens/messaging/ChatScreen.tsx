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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useMessagingStore } from '../../stores/messagingStore';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCallStore } from '../../stores/callStore';
import { useContactStore } from '../../stores/contactStore';
import { Message, Conversation } from '../../types';
import { wsService, fileAPI } from '../../services/api';
import MessageContextMenu from '../../components/messaging/MessageContextMenu';
import ChatOptionsMenu, { ChatMenuAction } from '../../components/messaging/ChatOptionsMenu';
import MessageStatusIndicator, { MessageStatus } from '../../components/messaging/MessageStatusIndicator';
import FileAttachmentPicker from '../../components/messaging/FileAttachmentPicker';
import ImageViewerModal from '../../components/messaging/ImageViewerModal';
import TypingIndicator from '../../components/messaging/TypingIndicator';
import OnlineStatusBadge from '../../components/common/OnlineStatusBadge';
import AuthenticatedImage from '../../components/common/AuthenticatedImage';
import ReactionPicker from '../../components/messaging/ReactionPicker';
import WhoReactedModal from '../../components/messaging/WhoReactedModal';
import LinkPreview from '../../components/messaging/LinkPreview';
import { extractFirstUrl, fetchLinkMetadata, containsUrl } from '../../utils/linkPreview';
import { saveDraft, loadDraft, clearDraft } from '../../utils/draftMessages';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { encryptionService } from '../../services/encryptionService';
import { encryptionAPI } from '../../services/api';

import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';

type ChatScreenProps = StackScreenProps<RootStackParamList, 'Chat'>;

const EncryptedMessageContent = ({ message, isMyMessage, style }: { message: Message, isMyMessage: boolean, style: any }) => {
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const decrypt = async () => {
      if (!message.isEncrypted || !message.encryptedContent || decryptedContent) return;

      try {
        const metadata = message.encryptionMetadata || {};
        const senderKey = message.senderId === message.recipientId ? null : null; // Logic to get sender public key?
        // Wait, for decryption we need SENDER's public key. 
        // We might not have it easily available here if it's not in message metadata.
        // It should be fetched.
        // Simplified for this prototype: We need to know who sent it.
        // The message object has senderId.

        // We need to fetch the sender's public key if we don't have it.
        // This is async and expensive to do for every message if not cached.
        // Ideally we cache it in a store.

        // For now, let's assume valid decryption needs sender public key.
        // BUT messagingStore doesn't expose it easily?
        // Actually, if it's a 1:1 chat, it's the OTHER user's key if incoming.
        // If it's outgoing, we encrypted it, so we can decrypt it with OUR private key + Recipient public key (if using box).
        // Wait, box is authenticated encryption.
        // Decrypt(box, nonce, SENDER_PUB, RECIPIENT_PRIV).
        // If I am recipient, I use SENDER_PUB.
        // If I am sender, I use RECIPIENT_PUB (to decrypt what I sent? No, I can't decrypt what I sent unless I saved the ephemeral keys or stored plain text locally or re-encrypted for myself).
        // Standard signal/E2E: Send to self (encrypt for self) OR store plaintext.
        // My implementation plan didn't specify multi-recipient or self-encryption.
        // "Old unencrypted messages will typically remain readable."
        // "Encrypt Messages on Send: Encrypt content using recipient's public key".
        // If I only encrypt for recipient, I (sender) CANNOT decrypt it later unless I also encrypt for myself.
        // Box encryption: shared secret.
        // Sender uses (SenderPriv, RecipientPub). Recipient uses (RecipientPriv, SenderPub). SAME Shared Key.
        // So YES, Sender CAN decrypt it using (SenderPriv, RecipientPub).

        // So we need "Other Party Public Key".
        // If 1:1 chat:
        // - If I am sender: Key is RecipientPub.
        // - If I am receiver: Key is SenderPub.
        // So it is ALWAYS the key of the 'other' person in the 1:1 chat.
        // (Assuming 1:1).

        // How do we get that key here efficiently?
        // We can fetch it via API or passed from parent?
        // Let's fetch local cached key if possible, or API.

        let otherUserId = isMyMessage ? message.recipientId : message.senderId;
        // Check if cached
        const cachedKey = await AsyncStorage.getItem(`public_key_${otherUserId}`);
        let key = cachedKey;

        if (!key) {
          try {
            const res = await encryptionAPI.getPublicKey(otherUserId);
            if (res.data?.data?.publicKey) {
              key = res.data.data.publicKey;
              await AsyncStorage.setItem(`public_key_${otherUserId}`, key);
            }
          } catch (fetchErr) {
            console.error('Failed to fetch public key for decryption', fetchErr);
            // Don't set error yet, maybe we can decrypt later or retry
          }
        }

        if (key && message.encryptedContent && metadata.nonce) {
          const text = await encryptionService.decrypt(message.encryptedContent, metadata.nonce, key);
          if (isMounted) setDecryptedContent(text);
        } else {
          if (isMounted) setError(true);
        }

      } catch (e) {
        console.error('Decryption failed', e);
        if (isMounted) setError(true);
      }
    };

    decrypt();

    return () => { isMounted = false; };
  }, [message]);

  if (!message.isEncrypted) {
    return <Text style={style}>{message.content}</Text>;
  }

  if (error) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[style, { color: 'red', fontStyle: 'italic' }]}>⚠️ Decryption failed</Text>
      </View>
    );
  }

  if (!decryptedContent) {
    return <Text style={[style, { fontStyle: 'italic', opacity: 0.7 }]}>🔒 Decrypting...</Text>;
  }

  return <Text style={style}>{decryptedContent}</Text>;
};

const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { conversationId } = route.params;
  const { user } = useAuthStore();
  const { privacy, appearance } = useSettingsStore();
  const theme = appearance.theme;
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
    markMessagesAsRead,
    setTyping,
    typingUsers,
    addReaction,
    removeReaction,
  } = useMessagingStore();
  const { contacts, blockContact, muteContact, unmuteContact, deleteContact: removeContact } = useContactStore();

  // Theme colors
  // Handle 'system' theme - default to light for now (TODO: use Appearance.getColorScheme())
  const isDark = theme === 'dark' || (theme === 'system' && false);
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
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
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
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(null); // State for E2E key

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hasLoadedDraft = useRef(false);
  const processedLinkPreviewIds = useRef<Set<string>>(new Set());
  const initialLoadComplete = useRef(false);
  const currentScrollOffset = useRef<number>(0);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    waitForInteraction: false,
  }).current;

  const conversation = conversationId ? conversations?.find(c => c.id === conversationId) : undefined;
  const conversationMessages = (conversationId && messages?.[conversationId]) || [];

  // Fetch recipient public key for E2E encryption
  useEffect(() => {
    const fetchPublicKey = async () => {
      if (conversationId && conversation?.type === 'direct') {
        const otherParticipant = conversation.participants.find(p => p.id !== user?.id);
        if (otherParticipant) {
          try {
            const res = await encryptionAPI.getPublicKey(otherParticipant.id);
            if (res.data?.data?.publicKey) {
              setRecipientPublicKey(res.data.data.publicKey);
              await AsyncStorage.setItem(`public_key_${otherParticipant.id}`, res.data.data.publicKey);
            }
          } catch (e) {
            // Failed to fetch public key for E2E
          }
        }
      }
    };
    fetchPublicKey();
  }, [conversationId, conversation?.type, user]);

  // Track messages that have been marked as read to avoid duplicate API calls
  const markedAsReadRef = useRef<Set<string>>(new Set());

  // Mark unread messages as read when they are loaded
  useEffect(() => {
    if (conversationMessages.length > 0 && user && conversationId) {
      const unreadMessages = conversationMessages.filter(
        (m: Message) => !m.isRead && m.senderId !== user.id && !markedAsReadRef.current.has(m.id)
      );

      if (unreadMessages.length > 0) {
        const unreadMessageIds = unreadMessages.map((m: Message) => m.id);

        // Mark these messages as being processed
        unreadMessageIds.forEach(id => markedAsReadRef.current.add(id));

        markMessagesAsRead(conversationId, unreadMessageIds);
      }
    }
    // Only run when message count changes or conversation changes, not on every message update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationMessages.length, conversationId]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const initializeConversation = async () => {
      if (conversationId) {
        setIsInitialLoading(true);
        // Clear tracking refs when changing conversations
        markedAsReadRef.current.clear();
        processedLinkPreviewIds.current.clear();
        initialLoadComplete.current = false; // Reset initial load flag
        hasLoadedDraft.current = false; // Reset draft loading flag

        // Clear message text when switching conversations
        setMessageText('');
        setEditingMessage(null);
        setReplyToMessage(null);
        currentScrollOffset.current = 0;

        await loadMessages(conversationId);
        // Reset pagination state for new conversation
        setCurrentPage(1);
        setHasMoreMessages(true);

        // Mark initial load as complete to allow pagination
        initialLoadComplete.current = true;

        // Load draft for this conversation
        const draft = await loadDraft(conversationId);
        if (draft) {
          setMessageText(draft);
        }
        hasLoadedDraft.current = true;
        setIsInitialLoading(false);
      }
    };

    initializeConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    // Join conversation for real-time updates
    wsService.emit('joinConversation', conversationId);

    // Listen for user status changes
    const handleUserStatusUpdate = (data: { userId: string; status: string }) => {
      // Update conversation participant status
      const { conversations, setConversations } = useMessagingStore.getState();
      const updatedConversations = conversations.map(conv => {
        if (conv.type === 'direct') {
          const updatedParticipants = (conv.participants || []).map(p => {
            if (p.id === data.userId) {
              return { ...p, isOnline: data.status === 'online' };
            }
            return p;
          });
          return { ...conv, participants: updatedParticipants };
        }
        return conv;
      });
      setConversations(updatedConversations);
    };

    wsService.on('user_status_update', handleUserStatusUpdate);
    wsService.on('user_online', handleUserStatusUpdate);
    wsService.on('user_offline', handleUserStatusUpdate);

    return () => {
      wsService.emit('leaveConversation', conversationId);
      wsService.off('user_status_update', handleUserStatusUpdate);
      wsService.off('user_online', handleUserStatusUpdate);
      wsService.off('user_offline', handleUserStatusUpdate);
    };
  }, [conversationId]);

  useEffect(() => {
    // Auto-fetch link previews for text messages with URLs
    // Only process NEW messages, not all messages on every change
    const fetchLinkPreviews = async () => {
      const newMessages = conversationMessages.filter(
        message =>
          message.type === 'text' &&
          !message.linkPreview &&
          !processedLinkPreviewIds.current.has(message.id) &&
          !linkPreviewsLoading.has(message.id) &&
          containsUrl(message.content)
      );

      // Process only new messages with links
      for (const message of newMessages) {
        const url = extractFirstUrl(message.content);
        if (url) {
          // Mark as processed to avoid reprocessing
          processedLinkPreviewIds.current.add(message.id);

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
    };

    fetchLinkPreviews();
    // Only depend on message count, not entire array reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationMessages.length]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || isSending) return;

    const messageToSend = messageText.trim();
    const messageToEdit = editingMessage;
    const replyTo = replyToMessage;

    // Clear typing timeout to prevent draft save after send
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
    }

    // Clear message text immediately
    setMessageText('');

    // Clear draft immediately (before sending to prevent race condition)
    await clearDraft(conversationId);

    setIsSending(true);
    try {
      if (messageToEdit) {
        // Edit existing message
        await editMessage(conversationId, messageToEdit.id, messageToSend);
        setEditingMessage(null);
      } else {
        // Send new message
        let finalContent = messageToSend;
        let encryptionData = undefined;

        // Encrypt if we have the key
        if (recipientPublicKey) {
          try {
            // Encode message for encryption
            const { ciphertext, nonce } = await encryptionService.encrypt(messageToSend, recipientPublicKey);
            encryptionData = {
              isEncrypted: true,
              encryptedContent: ciphertext,
              encryptionMetadata: { nonce, algorithm: 'x25519-xsalsa20-poly1305' }
            };
            // Set content to a placeholder that indicates encryption
            // This ensures older clients don't show "null" or empty bubbles if they don't support E2E
            finalContent = '🔒 Encrypted Message';
          } catch (err) {
            console.error('Encryption failed', err);
            Alert.alert(
              'Encryption Error',
              'Failed to encrypt message. Please try again or check your security settings.'
            );
            setIsSending(false);
            return;
          }
        }

        await sendMessage(conversationId, finalContent, replyTo?.id, undefined, encryptionData);
        setReplyToMessage(null);

        // Always scroll to top (offset 0) to show the new message in inverted list
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      }

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
    if (text && text.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTypingLocal(false);
        setTyping(conversationId, user!.id, false);
        // Save draft after user stops typing (only if text is not empty)
        if (text.trim()) {
          saveDraft(conversationId, text);
        }
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
    if (!privacy.showReadReceipts || !user) return;

    viewableItems.forEach((viewable: any) => {
      const message: Message = viewable.item;
      // Mark as read if it's not from current user, not already read, and not already processed
      if (message && !message.isRead && message.senderId !== user.id && !markedAsReadRef.current.has(message.id)) {
        markedAsReadRef.current.add(message.id);
        markAsRead(conversationId, message.id);
      }
    });
  }, [conversationId, markAsRead, user, privacy.showReadReceipts]);

  const handleMessagePress = useCallback((message: Message) => {
    // Keep this for additional tap-to-mark-read behavior if needed
  }, []);

  const handleMessageLongPress = useCallback((message: Message, event: any) => {
    setSelectedMessage(message);

    // Get the position from the touch event
    event.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      setMenuPosition({
        x: pageX + width / 2,
        y: pageY,
      });
      setShowActionsModal(true);
    });
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

  const handleCopyMessage = useCallback(async (message: Message) => {
    await Clipboard.setStringAsync(message.content);
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

      // Determine MIME type from file extension or type/mimeType property
      let mimeType = file.mimeType || file.type || 'image/jpeg';

      // Handle 'video' type from video picker
      if (mimeType === 'video') {
        mimeType = 'video/mp4';
      }

      // Try to determine from URI extension if still generic
      if (!file.mimeType && !file.type && file.uri) {
        const extension = file.uri.split('.').pop()?.toLowerCase();
        if (extension === 'png') mimeType = 'image/png';
        else if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
        else if (extension === 'webp') mimeType = 'image/webp';
        else if (extension === 'gif') mimeType = 'image/gif';
        else if (extension === 'mp4') mimeType = 'video/mp4';
      }

      const fileName = file.name || file.fileName || `file_${Date.now()}.${mimeType.split('/')[1]}`;

      // Create FormData for file upload - React Native requires specific format
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: mimeType,
        name: fileName,
      } as any);

      console.log('[ChatScreen] Uploading file:', {
        uri: file.uri,
        type: mimeType,
        name: fileName,
      });

      // Upload file to server
      const uploadResponse = await fileAPI.uploadFile(formData);
      const uploadedFile = uploadResponse.data.data;

      console.log('[ChatScreen] File uploaded successfully:', uploadedFile);

      // Send message with file attachment
      await sendMessage(
        conversationId,
        mimeType.startsWith('image/') ? '📷 Photo' : mimeType.startsWith('video/') ? '🎥 Video' : `📎 ${file.name}`,
        undefined,
        uploadedFile
      );
    } catch (error: any) {
      console.error('[ChatScreen] File upload error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        },
      });
      const errorMsg = error.response?.data?.error?.message || error.message || 'Failed to send file';
      Alert.alert('Upload Error', errorMsg);
    } finally {
      setIsSending(false);
    }
  }, [conversationId, sendMessage]);

  const handleImagePress = useCallback((imageUri: string) => {
    setViewingImageUri(imageUri);
    setShowImageViewer(true);
  }, []);

  const handleLoadMore = useCallback(async () => {
    console.log('[ChatScreen] handleLoadMore called', {
      initialLoadComplete: initialLoadComplete.current,
      isLoadingMore,
      hasMoreMessages,
      currentPage
    });

    // Prevent loading more messages until initial load completes
    if (!initialLoadComplete.current || isLoadingMore || !hasMoreMessages) {
      console.log('[ChatScreen] Load more blocked');
      return;
    }

    console.log('[ChatScreen] Loading page', currentPage + 1);
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await loadOlderMessages(conversationId, nextPage);

      setCurrentPage(nextPage);
      setHasMoreMessages(result.hasMore);

      if (result.messages.length === 0) {
        setHasMoreMessages(false);
      }

      console.log('[ChatScreen] Loaded page', nextPage, 'hasMore:', result.hasMore);
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
    const results = conversationMessages.filter(msg => {
      const msgType = (msg as any).messageType || msg.type || 'text';
      return msgType === 'text' && msg.content && msg.content.toLowerCase().includes(query.toLowerCase());
    });

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

  const handleScrollToMessage = useCallback((messageId: string) => {
    const messageIndex = conversationMessages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      // Scroll to the message
      flatListRef.current?.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5 // Center the message in view
      });

      // Highlight the message
      setHighlightedMessageId(messageId);

      // Remove highlight after 2 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  }, [conversationMessages]);

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

    // Close reaction picker
    setShowReactionPicker(false);
    setReactionTargetMessage(null);
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

  // Create swipeable refs at component level (not inside render functions)
  const swipeableRefs = useRef<Map<string, any>>(new Map());

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

  const renderSwipeAction = useCallback((isMyMessage: boolean) => {
    return (
      <View style={[
        styles.swipeActionContainer,
        isMyMessage ? styles.swipeActionLeft : styles.swipeActionRight,
      ]}>
        <Ionicons
          name="arrow-undo"
          size={24}
          color="#fff"
        />
      </View>
    );
  }, []);

  const renderMessage = ({ item: message }: { item: Message }) => {
    const isMyMessage = message.senderId === user?.id;
    const messageStatus = getMessageStatus(message);
    const isGroupChat = conversation?.type === 'group';

    // Find sender info for group chats - use message.sender if available
    const sender = !isMyMessage && isGroupChat
      ? (message.sender || conversation?.participants?.find(p => p.id === message.senderId))
      : null;

    // Determine message type and file URL (handle both frontend and backend formats)
    // Backend sends: messageType: "image", fileUrl: "/api/files/xxx"
    // Frontend sends: type: "image", file: { url: "/api/files/xxx" }
    // Backend returns: fileUrl at top level, or in metadata
    const messageType = (message as any).messageType || message.type || 'text';
    const fileUrl = (message as any).fileUrl || (message as any).metadata?.fileUrl || message.file?.url;
    const hasImage = (
      messageType === 'image' ||
      message.type === 'image' ||
      (fileUrl && (
        fileUrl.includes('.jpg') ||
        fileUrl.includes('.png') ||
        fileUrl.includes('.webp') ||
        fileUrl.includes('.jpeg') ||
        fileUrl.includes('.gif')
      ))
    );

    // Debug logging for photo messages
    if (messageType === 'image' || message.type === 'image' || fileUrl) {
      console.log('Photo message debug:', {
        messageId: message.id,
        messageType,
        frontendType: message.type,
        backendMessageType: (message as any).messageType,
        fileUrl,
        backendFileUrl: (message as any).fileUrl,
        fileObject: message.file,
        hasImage,
        content: message.content
      });
    }

    // Check if this message is a search result
    const isSearchResult = searchResults.length > 0 && searchResults[currentSearchIndex]?.id === message.id;

    // Check if this message is highlighted (from reply click)
    const isHighlighted = highlightedMessageId === message.id;

    const messageContent = (
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage,
          isSearchResult && styles.searchHighlight,
          isHighlighted && styles.replyHighlight,
        ]}
        onPress={() => handleOpenReactionPicker(message)}
        onLongPress={(event) => handleMessageLongPress(message, event)}
        delayLongPress={300}
      >

        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myBubble : styles.otherBubble,
        ]}>
          {/* Sender name for group chats */}
          {!isMyMessage && isGroupChat && sender && (
            <Text style={styles.senderName}>
              {sender.name ||
                (sender.firstName && sender.lastName ? `${sender.firstName} ${sender.lastName}` : null) ||
                sender.firstName ||
                sender.username ||
                'Unknown'}
            </Text>
          )}

          {/* Reply indicator */}
          {(() => {
            const replyData = (message as any).replyTo;
            if (!replyData) return null;

            // Backend sends replyTo as an object with { id, content, senderId, messageType, sender: {...} }
            const isReplyObject = typeof replyData === 'object' && replyData.content;
            if (!isReplyObject) return null;

            return (
              <TouchableOpacity
                style={styles.replyContainer}
                onPress={() => handleScrollToMessage(replyData.id)}
                activeOpacity={0.7}
              >
                <View style={styles.replyBar} />
                <View style={styles.replyContent}>
                  <Text style={styles.replySender} numberOfLines={1}>
                    {replyData.sender?.firstName || replyData.sender?.username || 'User'}
                  </Text>
                  <Text style={styles.replyText} numberOfLines={1}>
                    {replyData.content || 'Message'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })()}

          {/* Message content */}
          {hasImage && fileUrl ? (
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={() => handleImagePress(fileUrl.startsWith('http') ? fileUrl : `http://localhost:4000${fileUrl}`)}
              activeOpacity={0.9}
            >
              <AuthenticatedImage
                uri={fileUrl.startsWith('http') ? fileUrl : `http://localhost:4000${fileUrl}`}
                style={styles.messageImage}
                resizeMode="cover"
              />
              {message.content && message.content !== '📷 Photo' && (
                <Text style={[
                  { marginTop: 8 }
                ]}>
                  {message.content}
                </Text>
              )}
            </TouchableOpacity>
          ) : messageType === 'video' && fileUrl ? (
            <TouchableOpacity style={styles.imageContainer} activeOpacity={0.9}>
              <AuthenticatedImage
                uri={fileUrl.startsWith('http') ? fileUrl : `http://localhost:4000${fileUrl}`}
                style={styles.messageImage}
                resizeMode="cover"
              />
              <View style={styles.videoOverlay}>
                <Ionicons name="play-circle" size={48} color="#fff" />
              </View>
            </TouchableOpacity>
          ) : messageType === 'file' ? (
            <TouchableOpacity
              style={styles.fileContainer}
              onPress={() => {
                const url = (message as any).fileUrl || (message as any).metadata?.fileUrl;
                if (url) {
                  const fullUrl = url.startsWith('http') ? url : `http://localhost:4000${url}`;
                  Alert.alert(
                    'Download File',
                    `File: ${(message as any).metadata?.fileName || message.content || 'Document'}`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Download',
                        onPress: async () => {
                          try {
                            // TODO: Implement actual file download to device
                            Alert.alert('Download', 'File download functionality will be implemented');
                          } catch (error) {
                            Alert.alert('Error', 'Failed to download file');
                          }
                        }
                      }
                    ]
                  );
                }
              }}
            >
              <View style={styles.fileIconContainer}>
                <Ionicons name="document" size={24} color={colors.primary} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={[
                  styles.fileName,
                  { color: isMyMessage ? '#fff' : colors.text }
                ]} numberOfLines={1}>
                  {(message as any).metadata?.fileName || message.content || 'Document'}
                </Text>
                {(message as any).metadata?.fileSize && (
                  <Text style={[
                    styles.fileSize,
                    { color: isMyMessage ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
                  ]}>
                    {((message as any).metadata.fileSize / 1024).toFixed(1)} KB
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ) : messageType === 'voice' ? (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}>
              🎵 Voice message
            </Text>
          ) : messageType === 'system' ? (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
              { fontStyle: 'italic', opacity: 0.7 }
            ]}>
              {message.content}
            </Text>
          ) : (
            <>
              <EncryptedMessageContent
                message={message}
                isMyMessage={isMyMessage}
                style={[
                  styles.messageText,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText,
                ]}
              />
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
          {(() => {
            if (!message.reactions) return null;

            // Convert reactions to array if it's an object
            const reactionsArray = Array.isArray(message.reactions)
              ? message.reactions
              : Object.entries(message.reactions || {}).map(([emoji, users]) => ({
                emoji,
                users: Array.isArray(users) ? users : [users],
              }));

            // Filter out any empty or invalid reactions
            const validReactions = reactionsArray.filter(r => r.emoji && r.users && r.users.length > 0);

            if (validReactions.length === 0) return null;

            return (
              <View style={styles.reactionsContainer}>
                {validReactions.map((reaction, idx) => {
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
              </View>
            );
          })()}
        </View>

      </TouchableOpacity>
    );

    // Get or create ref for this message
    if (!swipeableRefs.current.has(message.id)) {
      swipeableRefs.current.set(message.id, null);
    }

    return (
      <Swipeable
        ref={(ref) => swipeableRefs.current.set(message.id, ref)}
        renderRightActions={isMyMessage ? () => renderSwipeAction(isMyMessage) : undefined}
        renderLeftActions={!isMyMessage ? () => renderSwipeAction(isMyMessage) : undefined}
        onSwipeableOpen={() => {
          setReplyToMessage(message);
          // Auto-close after setting reply
          setTimeout(() => {
            const ref = swipeableRefs.current.get(message.id);
            ref?.close();
          }, 200);
        }}
        overshootRight={false}
        overshootLeft={false}
        friction={1.5}
        rightThreshold={40}
        leftThreshold={40}
      >
        {messageContent}
      </Swipeable>
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

  // Get contact and mute status for chat options menu
  const otherUser = conversation.type === 'direct'
    ? conversation.participants?.find(p => p.id !== user?.id)
    : null;

  const contact = otherUser
    ? contacts.find(c => c.user?.id === otherUser.id || c.userId === otherUser.id)
    : null;

  const isMuted = contact?.isMuted || false;

  // Build chat options menu actions
  const chatMenuActions: ChatMenuAction[] = [];

  // Files & Media
  chatMenuActions.push({
    icon: 'folder-outline',
    label: 'Files & Media',
    onPress: () => {
      Alert.alert('Coming Soon', 'Files & Media gallery will be available soon');
    },
  });

  // Mute/Unmute Notifications
  if (conversation.type === 'direct') {
    chatMenuActions.push({
      icon: isMuted ? 'notifications' : 'notifications-off',
      label: isMuted ? 'Unmute Notifications' : 'Mute Notifications',
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
      },
    });
  }

  // Block User
  if (conversation.type === 'direct') {
    chatMenuActions.push({
      icon: 'ban',
      label: 'Block User',
      variant: 'danger',
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
      },
    });
  }

  // Delete Chat
  if (conversation.type === 'direct') {
    chatMenuActions.push({
      icon: 'trash',
      label: 'Delete Chat',
      variant: 'danger',
      onPress: () => {
        Alert.alert(
          'Delete Chat',
          'Are you sure you want to delete this chat? This will remove the contact and all messages.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                if (!contact) {
                  Alert.alert('Error', 'Contact not found');
                  return;
                }
                try {
                  await removeContact(contact.id);
                  Alert.alert('Deleted', 'Chat deleted');
                  navigation.goBack();
                } catch (error) {
                  Alert.alert('Error', 'Failed to delete chat');
                }
              }
            }
          ]
        );
      },
    });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              if (conversation.type === 'group') {
                navigation.navigate('GroupInfo', { groupId: conversation.id });
              }
              // Removed ContactProfile navigation - direct chats have no profile screen
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
            onPress={() => setShowChatOptionsMenu(true)}
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
        {isInitialLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={conversationMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContainer}
            ListHeaderComponent={renderTypingIndicator}
            ListFooterComponent={renderHeader}
            inverted
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScroll={(event) => {
              // Track current scroll position
              currentScrollOffset.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={400}
            initialNumToRender={20}
          />
        )}

        {/* Reply Bar */}
        {replyToMessage && (
          <View style={[
            styles.replyInputBar,
            {
              backgroundColor: isDark ? '#2a2a2a' : '#f9fafb',
              borderTopColor: colors.border
            }
          ]}>
            <View style={styles.replyBarContent}>
              <Ionicons name="arrow-undo" size={20} color={colors.textSecondary} />
              <View style={styles.replyBarText}>
                <Text style={[styles.replyBarTitle, { color: colors.textSecondary }]}>Replying to</Text>
                <Text style={[styles.replyBarMessage, { color: colors.text }]} numberOfLines={1}>
                  {replyToMessage.content}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleCancelReply}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Edit Bar */}
        {editingMessage && (
          <View style={[
            styles.editBar,
            {
              backgroundColor: isDark ? '#1a2a3a' : '#eff6ff',
              borderTopColor: isDark ? '#2a3a4a' : '#bfdbfe'
            }
          ]}>
            <View style={styles.editBarContent}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={[styles.editBarText, { color: colors.primary }]}>Editing message</Text>
            </View>
            <TouchableOpacity onPress={handleCancelEdit}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Message Input */}
        <View style={[
          styles.inputContainer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border
          }
        ]}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => setShowAttachmentPicker(true)}
          >
            <Ionicons name="add" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TextInput
            style={[
              styles.textInput,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text
              }
            ]}
            placeholder={editingMessage ? "Edit message..." : "Type a message..."}
            placeholderTextColor={colors.textSecondary}
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

      {/* Message Context Menu */}
      <MessageContextMenu
        visible={showActionsModal}
        message={selectedMessage}
        position={menuPosition}
        isOwnMessage={selectedMessage?.senderId === user?.id}
        onClose={() => {
          setShowActionsModal(false);
          setMenuPosition(null);
        }}
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

      {/* Chat Options Menu */}
      <ChatOptionsMenu
        visible={showChatOptionsMenu}
        onClose={() => setShowChatOptionsMenu(false)}
        actions={chatMenuActions}
        isDark={isDark}
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
  searchHighlight: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderRadius: 8,
    padding: 4,
  },
  replyHighlight: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    borderRadius: 8,
    padding: 4,
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
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholderTextSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  replySender: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
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
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: 12,
    minWidth: 200,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
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
    borderTopWidth: 1,
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
    fontWeight: '600',
  },
  replyBarMessage: {
    fontSize: 14,
  },
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  editBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBarText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  attachButton: {
    marginRight: 10,
    padding: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
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
  swipeActionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: '100%',
  },
  swipeActionLeft: {
    backgroundColor: '#2563eb',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    marginRight: 8,
  },
  swipeActionRight: {
    backgroundColor: '#2563eb',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginLeft: 8,
  },
});

export default ChatScreen;
