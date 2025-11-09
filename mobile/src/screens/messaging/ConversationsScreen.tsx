import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMessagingStore } from '../../stores/messagingStore';
import { useAuthStore } from '../../stores/authStore';
import { Conversation } from '../../types';
import { wsService } from '../../services/api';
import OnlineStatusBadge from '../../components/common/OnlineStatusBadge';

const ConversationsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const {
    conversations,
    isLoading,
    error,
    loadConversations,
    setActiveConversation,
    addMessage,
    updateMessage,
  } = useMessagingStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    // Set up WebSocket event listeners
    const handleNewMessage = (message: any) => {
      addMessage(message);
    };

    const handleMessageUpdate = (updatedMessage: any) => {
      updateMessage(updatedMessage);
    };

    wsService.on('message', handleNewMessage);
    wsService.on('messageUpdate', handleMessageUpdate);

    return () => {
      wsService.off('message', handleNewMessage);
      wsService.off('messageUpdate', handleMessageUpdate);
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, []);

  const handleConversationPress = (conversation: Conversation) => {
    setActiveConversation(conversation);
    navigation.navigate('Chat', { conversationId: conversation.id });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredConversations = (conversations || []).filter((conversation) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      conversation.name?.toLowerCase().includes(searchLower) ||
      (conversation.participants || []).some(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower)
      )
    );
  });

  const renderConversation = ({ item: conversation }: { item: Conversation }) => {
    const otherParticipants = (conversation.participants || []).filter(p => p.id !== user?.id);
    const displayName = conversation.type === 'group'
      ? conversation.name || `Group (${(conversation.participants || []).length})`
      : otherParticipants[0]?.name || otherParticipants[0]?.email || 'Unknown';

    const lastMessage = conversation.lastMessage;
    const lastMessageText = lastMessage?.type === 'text'
      ? lastMessage.content
      : lastMessage?.type === 'image'
      ? '📷 Photo'
      : lastMessage?.type === 'file'
      ? '📎 File'
      : 'Voice message';

    const isLastMessageFromMe = lastMessage?.senderId === user?.id;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(conversation)}
      >
        <View style={styles.avatarContainer}>
          {conversation.avatar ? (
            <Text style={styles.avatarText}>{conversation.avatar}</Text>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#666" />
            </View>
          )}
          {conversation.type === 'group' ? (
            <View style={styles.groupIndicator}>
              <Ionicons name="people" size={12} color="#fff" />
            </View>
          ) : (
            // Show online status for direct conversations
            otherParticipants[0]?.isOnline && (
              <OnlineStatusBadge
                isOnline={true}
                size={14}
                style={styles.onlineStatusBadge}
              />
            )
          )}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {displayName}
            </Text>
            {lastMessage && (
              <Text style={styles.timestamp}>
                {formatTimestamp(lastMessage.createdAt)}
              </Text>
            )}
          </View>

          <View style={styles.lastMessageContainer}>
            {lastMessage ? (
              <>
                {isLastMessageFromMe && <Text style={styles.youText}>You: </Text>}
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {lastMessageText}
                </Text>
              </>
            ) : (
              <Text style={styles.noMessages}>No messages yet</Text>
            )}
          </View>
        </View>

        {conversation.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadConversations}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.emptyText}>Loading conversations...</Text>
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>Start a conversation with your contacts</Text>
            </View>
          )
        }
        contentContainerStyle={filteredConversations.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Alert.alert(
            'New Conversation',
            'Choose an option',
            [
              {
                text: 'New Group',
                onPress: () => navigation.navigate('CreateGroup'),
              },
              {
                text: 'New Chat',
                onPress: () => navigation.navigate('Contacts'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
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
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 5,
    marginLeft: 10,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  groupIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineStatusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  youText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  noMessages: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 15,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default ConversationsScreen;