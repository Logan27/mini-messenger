import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContactStore } from '../../stores/contactStore';
import { useAuthStore } from '../../stores/authStore';
import { ContactRequest } from '../../types';

interface ContactRequestsScreenProps {
  navigation: any;
}

type TabType = 'incoming' | 'outgoing';

const ContactRequestsScreen: React.FC<ContactRequestsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuthStore();
  const {
    contactRequests,
    isLoading,
    error,
    loadContactRequests,
    acceptContact,
    rejectContact,
    deleteContact,
    clearError,
  } = useContactStore();

  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadContactRequests();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContactRequests();
    setRefreshing(false);
  };

  const handleAccept = async (request: ContactRequest) => {
    Alert.alert(
      'Accept Request',
      `Accept contact request from ${request.user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptContact(request.id);
              Alert.alert('Success', `${request.user.name} added to your contacts`);
            } catch (err) {
              // Error handled by store
            }
          },
        },
      ]
    );
  };

  const handleReject = async (request: ContactRequest) => {
    Alert.alert(
      'Reject Request',
      `Reject contact request from ${request.user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectContact(request.id);
            } catch (err) {
              // Error handled by store
            }
          },
        },
      ]
    );
  };

  const handleCancel = async (request: ContactRequest) => {
    Alert.alert(
      'Cancel Request',
      `Cancel contact request to ${request.user.name}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(request.id);
            } catch (err) {
              // Error handled by store
            }
          },
        },
      ]
    );
  };

  const incomingRequests = contactRequests.filter(
    (r) => r.contactUserId === currentUser?.id
  );
  const outgoingRequests = contactRequests.filter(
    (r) => r.userId === currentUser?.id
  );

  const displayRequests = activeTab === 'incoming' ? incomingRequests : outgoingRequests;

  const renderRequestItem = ({ item }: { item: ContactRequest }) => {
    const isIncoming = item.contactUserId === currentUser?.id;
    const initials = (item.user.name || item.user.username || 'U').slice(0, 2).toUpperCase();
    const timeAgo = getTimeAgo(item.createdAt);

    return (
      <View style={styles.requestItem}>
        <View style={styles.requestContent}>
          <View style={styles.avatarContainer}>
            {item.user.avatar || item.user.profilePicture ? (
              <Text style={styles.avatar}>{initials}</Text>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            {item.user.isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.requestInfo}>
            <Text style={styles.userName}>{item.user.name}</Text>
            <Text style={styles.userUsername}>@{item.user.username || 'unknown'}</Text>
            <Text style={styles.timeAgo}>{timeAgo}</Text>
          </View>
        </View>

        {isIncoming ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item)}
              disabled={isLoading}
            >
              <Ionicons name="close" size={20} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAccept(item)}
              disabled={isLoading}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleCancel(item)}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={activeTab === 'incoming' ? 'mail-open-outline' : 'paper-plane-outline'}
        size={64}
        color="#d1d5db"
      />
      <Text style={styles.emptyText}>
        {activeTab === 'incoming' ? 'No incoming requests' : 'No outgoing requests'}
      </Text>
      <Text style={styles.emptySubtext}>
        {activeTab === 'incoming'
          ? "You'll see contact requests here when someone adds you"
          : 'Requests you send to others will appear here'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incoming' && styles.activeTab]}
          onPress={() => setActiveTab('incoming')}
        >
          <Text style={[styles.tabText, activeTab === 'incoming' && styles.activeTabText]}>
            Incoming
          </Text>
          {incomingRequests.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{incomingRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outgoing' && styles.activeTab]}
          onPress={() => setActiveTab('outgoing')}
        >
          <Text style={[styles.tabText, activeTab === 'outgoing' && styles.activeTabText]}>
            Outgoing
          </Text>
          {outgoingRequests.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{outgoingRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Requests List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : displayRequests.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={displayRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
};

// Helper function to format time ago
const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  requestContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  requestInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  rejectButton: {
    borderColor: '#fecaca',
    backgroundColor: '#fff',
  },
  acceptButton: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default ContactRequestsScreen;
