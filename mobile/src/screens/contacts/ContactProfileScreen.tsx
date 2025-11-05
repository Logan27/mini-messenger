import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContactStore } from '../../stores/contactStore';
import { useMessagingStore } from '../../stores/messagingStore';
import { Contact, User, Group, Message } from '../../types';

interface ContactProfileScreenProps {
  route: any;
  navigation: any;
}

const ContactProfileScreen: React.FC<ContactProfileScreenProps> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { contactId } = route.params;
  const { contacts, blockContact, unblockContact, deleteContact } = useContactStore();
  const { conversations } = useMessagingStore();

  const [contact, setContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sharedMedia, setSharedMedia] = useState<Message[]>([]);
  const [mutualGroups, setMutualGroups] = useState<Group[]>([]);

  useEffect(() => {
    loadContactData();
  }, [contactId]);

  const loadContactData = async () => {
    setIsLoading(true);
    try {
      // Find contact
      const foundContact = contacts.find(c => c.id === contactId);
      if (foundContact) {
        setContact(foundContact);
      }

      // Load shared media (images, videos, files)
      // TODO: Implement API call to get shared media
      const mockMedia: Message[] = [];
      setSharedMedia(mockMedia);

      // Load mutual groups
      // TODO: Implement API call to get mutual groups
      const mockGroups: Group[] = [];
      setMutualGroups(mockGroups);

    } catch (error) {
      console.error('Failed to load contact data:', error);
      Alert.alert('Error', 'Failed to load contact information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = () => {
    if (!contact) return;

    // Find or create conversation with this contact
    const conversation = conversations.find(c =>
      c.type === 'direct' &&
      c.participants.some(p => p.id === contact.user.id)
    );

    if (conversation) {
      navigation.navigate('Chat', { conversationId: conversation.id });
    } else {
      // TODO: Create new conversation
      Alert.alert('Info', 'Creating conversation...');
    }
  };

  const handleCall = () => {
    Alert.alert('Video Call', 'Video calling feature coming soon!');
  };

  const handleBlock = async () => {
    if (!contact) return;

    const isBlocked = contact.status === 'blocked';

    Alert.alert(
      isBlocked ? 'Unblock Contact' : 'Block Contact',
      isBlocked
        ? `Are you sure you want to unblock ${contact.user.name}?`
        : `Are you sure you want to block ${contact.user.name}? They won't be able to message or call you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isBlocked) {
                await unblockContact(contact.id);
                Alert.alert('Success', `${contact.user.name} has been unblocked`);
              } else {
                await blockContact(contact.id);
                Alert.alert('Success', `${contact.user.name} has been blocked`);
              }
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to update contact status');
            }
          },
        },
      ]
    );
  };

  const handleRemove = () => {
    if (!contact) return;

    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contact.user.name} from your contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(contact.id);
              Alert.alert('Success', `${contact.user.name} has been removed from your contacts`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove contact');
            }
          },
        },
      ]
    );
  };

  if (isLoading || !contact) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  const initials = contact.user.name.slice(0, 2).toUpperCase();
  const isBlocked = contact.status === 'blocked';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Info</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {contact.user.avatar || contact.user.profilePicture ? (
            <Image
              source={{ uri: contact.user.avatar || contact.user.profilePicture }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}

          <Text style={styles.name}>
            {contact.nickname || contact.user.name}
          </Text>

          {contact.nickname && (
            <Text style={styles.actualName}>{contact.user.name}</Text>
          )}

          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: contact.user.isOnline ? '#10b981' : '#6b7280' }]} />
            <Text style={styles.statusText}>
              {contact.user.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>

          {contact.user.bio && (
            <Text style={styles.bio}>{contact.user.bio}</Text>
          )}

          {isBlocked && (
            <View style={styles.blockedBanner}>
              <Ionicons name="ban" size={16} color="#ef4444" />
              <Text style={styles.blockedText}>Blocked</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        {!isBlocked && (
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="chatbubble" size={24} color="#2563eb" />
              </View>
              <Text style={styles.actionLabel}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="videocam" size={24} color="#2563eb" />
              </View>
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleBlock}>
              <View style={[styles.actionIconContainer, styles.actionIconDanger]}>
                <Ionicons name="ban" size={24} color="#ef4444" />
              </View>
              <Text style={[styles.actionLabel, styles.actionLabelDanger]}>Block</Text>
            </TouchableOpacity>
          </View>
        )}

        {isBlocked && (
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.actionButton} onPress={handleBlock}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              </View>
              <Text style={styles.actionLabel}>Unblock</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Ionicons name="mail" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{contact.user.email}</Text>
              </View>
            </View>

            {contact.user.phoneNumber && (
              <View style={styles.infoItem}>
                <Ionicons name="call" size={20} color="#6b7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{contact.user.phoneNumber}</Text>
                </View>
              </View>
            )}

            {contact.user.username && (
              <View style={styles.infoItem}>
                <Ionicons name="at" size={20} color="#6b7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Username</Text>
                  <Text style={styles.infoValue}>@{contact.user.username}</Text>
                </View>
              </View>
            )}

            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Added</Text>
                <Text style={styles.infoValue}>
                  {new Date(contact.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shared Media */}
        {!isBlocked && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shared Media</Text>
              {sharedMedia.length > 0 && (
                <TouchableOpacity>
                  <Text style={styles.sectionLink}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            {sharedMedia.length > 0 ? (
              <View style={styles.mediaGrid}>
                {sharedMedia.slice(0, 6).map((media, index) => (
                  <TouchableOpacity key={index} style={styles.mediaItem}>
                    <Image
                      source={{ uri: media.file?.url }}
                      style={styles.mediaThumbnail}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No shared media yet</Text>
              </View>
            )}
          </View>
        )}

        {/* Mutual Groups */}
        {!isBlocked && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Mutual Groups ({mutualGroups.length})
            </Text>
            {mutualGroups.length > 0 ? (
              <View style={styles.groupsList}>
                {mutualGroups.map((group, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.groupItem}
                    onPress={() => navigation.navigate('GroupInfo', { groupId: group.id })}
                  >
                    <View style={styles.groupIcon}>
                      <Ionicons name="people" size={24} color="#2563eb" />
                    </View>
                    <View style={styles.groupInfo}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupMembers}>
                        {group.memberCount || 0} members
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No mutual groups</Text>
              </View>
            )}
          </View>
        )}

        {/* Danger Zone */}
        {!isBlocked && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            <TouchableOpacity style={styles.dangerButton} onPress={handleRemove}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={styles.dangerButtonText}>Remove Contact</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginLeft: 15,
  },
  headerSpacer: {
    width: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    paddingBottom: 24,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#f9fafb',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  actualName: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  bio: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  blockedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 6,
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#f9fafb',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconDanger: {
    backgroundColor: '#fef2f2',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  actionLabelDanger: {
    color: '#ef4444',
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 8,
    borderBottomColor: '#f9fafb',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  mediaItem: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  groupsList: {
    gap: 12,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  groupMembers: {
    fontSize: 14,
    color: '#6b7280',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
});

export default ContactProfileScreen;
