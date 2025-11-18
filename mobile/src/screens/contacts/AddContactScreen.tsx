import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContactStore } from '../../stores/contactStore';
import { useAuthStore } from '../../stores/authStore';
import { User } from '../../types';

interface AddContactScreenProps {
  navigation: any;
}

const AddContactScreen: React.FC<AddContactScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuthStore();
  const {
    searchResults,
    contacts,
    isLoading,
    error,
    searchUsers,
    addContact,
    clearError,
  } = useContactStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState('');
  const [notes, setNotes] = useState('');

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      searchUsers(searchQuery).finally(() => setIsSearching(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const isAlreadyContact = useCallback((userId: string) => {
    return contacts.some((c) => c.user.id === userId);
  }, [contacts]);

  const handleAddContact = async (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Invalid Action', "You can't add yourself as a contact");
      return;
    }

    if (isAlreadyContact(user.id)) {
      Alert.alert('Already Added', 'This user is already in your contacts');
      return;
    }

    setSelectedUser(user);
  };

  const handleSendRequest = async () => {
    if (!selectedUser) return;

    try {
      await addContact(selectedUser.id, nickname.trim() || undefined, notes.trim() || undefined);
      Alert.alert(
        'Request Sent',
        `Contact request sent to ${selectedUser.name}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedUser(null);
              setNickname('');
              setNotes('');
              setSearchQuery('');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (err) {
      // Error handled by store
    }
  };

  const renderSearchResult = ({ item }: { item: User }) => {
    const isCurrentUser = item.id === currentUser?.id;
    const alreadyContact = isAlreadyContact(item.id);
    const initials = (item.name || item.username || 'U').slice(0, 2).toUpperCase();

    return (
      <TouchableOpacity
        style={[
          styles.resultItem,
          (isCurrentUser || alreadyContact) && styles.resultItemDisabled,
        ]}
        onPress={() => !isCurrentUser && !alreadyContact && handleAddContact(item)}
        disabled={isCurrentUser || alreadyContact}
      >
        <View style={styles.avatarContainer}>
          {item.avatar || item.profilePicture ? (
            <Image source={{ uri: item.avatar || item.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userUsername}>@{item.username || 'unknown'}</Text>
          {item.email && (
            <Text style={styles.userEmail}>{item.email}</Text>
          )}
        </View>

        {isCurrentUser ? (
          <View style={styles.tagContainer}>
            <Text style={styles.tagText}>You</Text>
          </View>
        ) : alreadyContact ? (
          <View style={[styles.tagContainer, styles.tagAdded]}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={[styles.tagText, styles.tagAddedText]}>Added</Text>
          </View>
        ) : (
          <Ionicons name="person-add" size={24} color="#2563eb" />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (searchQuery.trim().length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>Search for users</Text>
          <Text style={styles.emptySubtext}>
            Enter a name, username, or email to find contacts
          </Text>
        </View>
      );
    }

    if (isSearching) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>
            Try a different search term
          </Text>
        </View>
      );
    }

    return null;
  };

  if (selectedUser) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedUser(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Contact</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.detailsContainer}>
          {/* Selected User Info */}
          <View style={styles.selectedUserCard}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {(selectedUser.name || selectedUser.username || 'U').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.selectedUserName}>{selectedUser.name}</Text>
            <Text style={styles.selectedUserUsername}>@{selectedUser.username}</Text>
          </View>

          {/* Optional Fields */}
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Nickname (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Give this contact a nickname"
              value={nickname}
              onChangeText={setNickname}
              maxLength={100}
              autoCapitalize="words"
              autoComplete="off"
              textContentType="none"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.formLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any notes about this contact"
              value={notes}
              onChangeText={setNotes}
              maxLength={500}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoComplete="off"
              textContentType="none"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setSelectedUser(null);
                setNickname('');
                setNotes('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
              onPress={handleSendRequest}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

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
        <Text style={styles.headerTitle}>Add Contact</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, username, or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      {searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        renderEmptyState()
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
  listContent: {
    paddingBottom: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultItemDisabled: {
    opacity: 0.5,
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
  userInfo: {
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
  userEmail: {
    fontSize: 13,
    color: '#9ca3af',
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagAdded: {
    backgroundColor: '#d1fae5',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  tagAddedText: {
    color: '#10b981',
    marginLeft: 4,
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
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  selectedUserCard: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedUserName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  selectedUserUsername: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  formContainer: {
    marginTop: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AddContactScreen;
