import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { Contact } from '../../types';

interface ContactsListScreenProps {
  navigation: any;
}

const ContactsListScreen: React.FC<ContactsListScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    contacts,
    contactRequests,
    isLoading,
    error,
    loadContacts,
    loadContactRequests,
    deleteContact,
    favoriteContact,
    unfavoriteContact,
    muteContact,
    unmuteContact,
    clearError,
  } = useContactStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [error]);

  useEffect(() => {
    // Filter contacts based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredContacts(
        contacts.filter((contact) =>
          contact.user.username?.toLowerCase().includes(query) ||
          contact.user.name.toLowerCase().includes(query) ||
          contact.user.email.toLowerCase().includes(query) ||
          contact.nickname?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const loadData = async () => {
    await Promise.all([
      loadContacts(),
      loadContactRequests(),
    ]);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleContactPress = (contact: Contact) => {
    // Navigate to chat with this contact
    navigation.navigate('Chat', { contactId: contact.user.id });
  };

  const handleContactLongPress = (contact: Contact) => {
    const options = [
      'View Profile',
      contact.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
      contact.isMuted ? 'Unmute' : 'Mute',
      'Delete Contact',
      'Cancel',
    ];

    Alert.alert(
      contact.nickname || contact.user.name,
      'Choose an action',
      [
        {
          text: 'View Profile',
          onPress: () => navigation.navigate('ContactProfile', { contactId: contact.id }),
        },
        {
          text: contact.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
          onPress: () => {
            if (contact.isFavorite) {
              unfavoriteContact(contact.id);
            } else {
              favoriteContact(contact.id);
            }
          },
        },
        {
          text: contact.isMuted ? 'Unmute' : 'Mute',
          onPress: () => {
            if (contact.isMuted) {
              unmuteContact(contact.id);
            } else {
              muteContact(contact.id);
            }
          },
        },
        {
          text: 'Delete Contact',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Contact',
              `Are you sure you want to remove ${contact.nickname || contact.user.name} from your contacts?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteContact(contact.id);
                    } catch (err) {
                      // Error handled by store
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderContactItem = ({ item }: { item: Contact }) => {
    const getUserDisplayName = (user: any) => {
      if (user.name) return user.name;
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      }
      if (user.firstName) return user.firstName;
      if (user.username) return user.username;
      return 'Unknown';
    };

    const displayName = item.nickname || getUserDisplayName(item.user);
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleContactPress(item)}
        onLongPress={() => handleContactLongPress(item)}
      >
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

        <View style={styles.contactInfo}>
          <View style={styles.contactHeader}>
            <Text style={styles.contactName}>
              {displayName}
              {item.isFavorite && <Ionicons name="star" size={14} color="#fbbf24" style={{ marginLeft: 4 }} />}
            </Text>
            {item.isMuted && (
              <Ionicons name="volume-mute" size={16} color="#9ca3af" />
            )}
          </View>
          <Text style={styles.contactUsername}>@{item.user.username || 'unknown'}</Text>
          {item.notes && (
            <Text style={styles.contactNotes} numberOfLines={1}>{item.notes}</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyText}>No contacts yet</Text>
      <Text style={styles.emptySubtext}>
        Add contacts to start messaging
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddContact')}
      >
        <Ionicons name="person-add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Contact</Text>
      </TouchableOpacity>
    </View>
  );

  const favoriteContacts = filteredContacts.filter((c) => c.isFavorite);
  const regularContacts = filteredContacts.filter((c) => !c.isFavorite);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('ContactRequests')}
          >
            <Ionicons name="mail-outline" size={24} color="#1f2937" />
            {contactRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{contactRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('AddContact')}
          >
            <Ionicons name="person-add-outline" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Contacts List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : filteredContacts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={[
            ...(favoriteContacts.length > 0 ? [{ isSectionHeader: true, title: 'Favorites' }] : []),
            ...favoriteContacts,
            ...(regularContacts.length > 0 && favoriteContacts.length > 0 ? [{ isSectionHeader: true, title: 'All Contacts' }] : []),
            ...regularContacts,
          ]}
          renderItem={({ item }) => {
            if ('isSectionHeader' in item) {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{item.title}</Text>
                </View>
              );
            }
            return renderContactItem({ item } as any);
          }}
          keyExtractor={(item, index) =>
            'isSectionHeader' in item ? `section-${index}` : (item as Contact).id
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  contactUsername: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  contactNotes: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
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
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ContactsListScreen;
