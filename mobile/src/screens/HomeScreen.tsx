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
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMessagingStore } from '../stores/messagingStore';
import { useContactStore } from '../stores/contactStore';
import { useGroupStore } from '../stores/groupStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Conversation } from '../types';
import { wsService } from '../services/api';
import OnlineStatusBadge from '../components/common/OnlineStatusBadge';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { appearance } = useSettingsStore();
  const theme = appearance.theme;
  const {
    conversations,
    isLoading: isLoadingConversations,
    error: conversationsError,
    loadConversations,
    setActiveConversation,
    addMessage,
    updateMessage,
  } = useMessagingStore();

  const {
    contacts,
    contactRequests,
    isLoading: isLoadingContacts,
    loadContacts,
    loadContactRequests,
  } = useContactStore();

  const { groups, loadGroups } = useGroupStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');

  // Handle 'system' theme - default to light for now (TODO: use Appearance.getColorScheme())
  const isDark = theme === 'dark' || (theme === 'system' && false);
  const colors = {
    background: isDark ? '#000000' : '#ffffff',
    card: isDark ? '#1a1a1a' : '#f8f9fa',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: '#2563eb',
    accent: isDark ? '#1f2937' : '#f3f4f6',
    tabActive: '#2563eb',
    tabInactive: isDark ? '#6b7280' : '#9ca3af',
    searchBg: isDark ? '#1f2937' : '#f3f4f6',
  };

  useEffect(() => {
    loadConversations();
    loadContacts();
    loadContactRequests();
    loadGroups();
  }, []);

  useEffect(() => {
    // Set up WebSocket event listeners
    const handleNewMessage = (message: any) => {
      addMessage(message);
    };

    const handleMessageUpdate = (updatedMessage: any) => {
      updateMessage(updatedMessage);
    };

    wsService.on('message.new', handleNewMessage);
    wsService.on('messageUpdate', handleMessageUpdate);

    return () => {
      wsService.off('message.new', handleNewMessage);
      wsService.off('messageUpdate', handleMessageUpdate);
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadConversations(), loadContacts(), loadContactRequests(), loadGroups()]);
    setRefreshing(false);
  }, []);

  const handleConversationPress = (conversation: Conversation) => {
    setActiveConversation(conversation);
    navigation.navigate('Chat', { conversationId: conversation.id });
  };

  const handleContactPress = (contact: any) => {
    // Start a conversation with this contact
    const user = contact.user || contact;
    navigation.navigate('Chat', {
      conversationId: user.id,
      recipientId: user.id,
      recipientName: contact.nickname || user.name || user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Filter conversations
  const filteredConversations = (conversations || []).filter((conversation) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      conversation.name?.toLowerCase().includes(searchLower) ||
      (conversation.participants || []).some(p => {
        const fullName = p.firstName && p.lastName
          ? `${p.firstName} ${p.lastName}`.toLowerCase()
          : (p.firstName || p.lastName || '').toLowerCase();
        return (
          fullName.includes(searchLower) ||
          p.email?.toLowerCase().includes(searchLower) ||
          p.username?.toLowerCase().includes(searchLower)
        );
      })
    );
  });

  // Filter contacts
  const filteredContacts = (contacts || []).filter((contact) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    const fullName = contact.firstName && contact.lastName
      ? `${contact.firstName} ${contact.lastName}`.toLowerCase()
      : (contact.firstName || contact.lastName || '').toLowerCase();

    return (
      fullName.includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.username?.toLowerCase().includes(searchLower) ||
      contact.nickname?.toLowerCase().includes(searchLower)
    );
  });

  const renderConversation = ({ item: conversation }: { item: Conversation }) => {
    const otherParticipants = (conversation.participants || []).filter(p => p.id !== user?.id);
    const getParticipantName = (participant: any) => {
      if (!participant) return 'Unknown';
      if (participant.name) return participant.name;
      if (participant.firstName && participant.lastName) {
        return `${participant.firstName} ${participant.lastName}`;
      }
      if (participant.firstName) return participant.firstName;
      if (participant.username) return participant.username;
      return participant.email || 'Unknown';
    };

    const displayName = conversation.type === 'group'
      ? conversation.name || `Group (${(conversation.participants || []).length})`
      : getParticipantName(otherParticipants[0]) || 'Unknown';

    const lastMessage = conversation.lastMessage;
    const lastMessageText = lastMessage
      ? (lastMessage.messageType === 'text' || lastMessage.type === 'text')
        ? lastMessage.content
        : (lastMessage.messageType === 'image' || lastMessage.type === 'image')
        ? '📷 Photo'
        : (lastMessage.messageType === 'file' || lastMessage.type === 'file')
        ? '📎 File'
        : 'Voice message'
      : 'No messages yet';

    const isLastMessageFromMe = lastMessage?.senderId === user?.id;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, { borderBottomColor: colors.border }]}
        onPress={() => handleConversationPress(conversation)}
      >
        <View style={styles.avatarContainer}>
          {conversation.type === 'group' && conversation.avatar ? (
            <Image
              source={{ uri: conversation.avatar }}
              style={styles.avatar}
            />
          ) : (otherParticipants[0]?.avatar || otherParticipants[0]?.profilePicture) ? (
            <Image
              source={{ uri: otherParticipants[0]?.avatar || otherParticipants[0]?.profilePicture }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarPlaceholderText}>
                {displayName ? displayName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          {conversation.type === 'group' ? (
            <View style={[styles.groupIndicator, { backgroundColor: colors.primary }]}>
              <Ionicons name="people" size={12} color="#fff" />
            </View>
          ) : (
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
            <Text style={[styles.conversationName, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            {lastMessage && (
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                {formatTimestamp(lastMessage.createdAt)}
              </Text>
            )}
          </View>

          <View style={styles.lastMessageContainer}>
            {lastMessage ? (
              <>
                {isLastMessageFromMe && <Text style={[styles.youText, { color: colors.textSecondary }]}>You: </Text>}
                <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                  {lastMessageText}
                </Text>
              </>
            ) : (
              <Text style={[styles.noMessages, { color: colors.textSecondary }]}>No messages yet</Text>
            )}
          </View>
        </View>

        {(conversation.unreadCount || 0) > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderContact = ({ item: contact }: { item: any }) => {
    const user = contact.user || contact;
    const displayName = (user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : contact.nickname || user.name || user.firstName || user.lastName || user.username || 'Unknown');

    const avatarUri = user.avatar || user.profilePicture;
    const fullAvatarUri = avatarUri && !avatarUri.startsWith('http')
      ? `http://localhost:4000${avatarUri}`
      : avatarUri;

    return (
      <TouchableOpacity
        style={[styles.contactItem, { borderBottomColor: colors.border }]}
        onPress={() => handleContactPress(contact)}
      >
        <View style={styles.avatarContainer}>
          {fullAvatarUri ? (
            <Image
              source={{ uri: fullAvatarUri }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarPlaceholderText}>
                {displayName ? displayName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          {user.isOnline && (
            <OnlineStatusBadge
              isOnline={true}
              size={14}
              style={styles.onlineStatusBadge}
            />
          )}
        </View>

        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          {user.username && (
            <Text style={[styles.contactUsername, { color: colors.textSecondary }]} numberOfLines={1}>
              @{user.username}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

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

  const pendingRequestsCount = contactRequests?.length || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => navigation.openDrawer()}
              style={styles.menuButton}
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('CreateGroup')}
            >
              <Ionicons name="people-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('AddContact')}
            >
              <Ionicons name="person-add-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'chats' && [styles.tabActive, { borderBottomColor: colors.tabActive }],
            ]}
            onPress={() => setActiveTab('chats')}
          >
            <Ionicons
              name="chatbubbles"
              size={18}
              color={activeTab === 'chats' ? colors.tabActive : colors.tabInactive}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'chats' ? colors.tabActive : colors.tabInactive },
              ]}
            >
              Chats
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'contacts' && [styles.tabActive, { borderBottomColor: colors.tabActive }],
            ]}
            onPress={() => setActiveTab('contacts')}
          >
            <Ionicons
              name="people"
              size={18}
              color={activeTab === 'contacts' ? colors.tabActive : colors.tabInactive}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'contacts' ? colors.tabActive : colors.tabInactive },
              ]}
            >
              Contacts
            </Text>
            {pendingRequestsCount > 0 && (
              <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.searchBg }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={activeTab === 'chats' ? 'Search chats...' : 'Search contacts...'}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'chats' ? (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            isLoadingConversations ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Loading conversations...
                </Text>
              </View>
            ) : (
              <View style={styles.centerContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.text }]}>No conversations yet</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Start a conversation with your contacts
                </Text>
              </View>
            )
          }
          contentContainerStyle={filteredConversations.length === 0 ? styles.emptyContainer : undefined}
        />
      ) : (
        <>
          {pendingRequestsCount > 0 && (
            <TouchableOpacity
              style={[styles.pendingRequestsBanner, { backgroundColor: colors.accent, borderBottomColor: colors.border }]}
              onPress={() => navigation.navigate('ContactRequests')}
            >
              <Ionicons name="person-add" size={24} color={colors.primary} />
              <View style={styles.pendingRequestsText}>
                <Text style={[styles.pendingRequestsTitle, { color: colors.text }]}>
                  Pending Requests
                </Text>
                <Text style={[styles.pendingRequestsSubtitle, { color: colors.textSecondary }]}>
                  {pendingRequestsCount} contact {pendingRequestsCount === 1 ? 'request' : 'requests'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <FlatList
            data={filteredContacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              isLoadingContacts ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Loading contacts...
                  </Text>
                </View>
              ) : (
                <View style={styles.centerContainer}>
                  <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.text }]}>No contacts yet</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                    Add contacts to start chatting
                  </Text>
                </View>
              )
            }
            contentContainerStyle={filteredContacts.length === 0 ? styles.emptyContainer : undefined}
          />
        </>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
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
                onPress: () => navigation.navigate('AddContact'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: '25%',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  groupIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
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
    bottom: 0,
    right: 0,
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
    flex: 1,
  },
  timestamp: {
    fontSize: 13,
    marginLeft: 8,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  youText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  noMessages: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  unreadBadge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactUsername: {
    fontSize: 14,
  },
  pendingRequestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  pendingRequestsText: {
    flex: 1,
  },
  pendingRequestsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  pendingRequestsSubtitle: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});

export default HomeScreen;
