import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Contact } from '../../types';
import { useGroupStore } from '../../stores/groupStore';
import { useContactStore } from '../../stores/contactStore';
import { useAuthStore } from '../../stores/authStore';

type CreateGroupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface CreateGroupScreenProps {
  navigation: CreateGroupScreenNavigationProp;
}

const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ navigation }) => {
  const { createGroup, isLoading } = useGroupStore();
  const { contacts, loadContacts } = useContactStore();
  const { user: currentUser } = useAuthStore();

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState<'private' | 'public'>('private');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const filteredContacts = contacts.filter((contact) =>
    contact.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const validateForm = (): boolean => {
    if (!groupName.trim()) {
      setNameError('Group name is required');
      return false;
    }
    if (groupName.trim().length < 3) {
      setNameError('Group name must be at least 3 characters');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleCreateGroup = async () => {
    if (!validateForm()) return;

    if (selectedMembers.length === 0) {
      Alert.alert(
        'No Members Selected',
        'Would you like to create a group without adding members? You can add them later.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => performCreateGroup() },
        ]
      );
      return;
    }

    performCreateGroup();
  };

  const performCreateGroup = async () => {
    try {
      await createGroup({
        name: groupName.trim(),
        description: description.trim() || undefined,
        groupType,
        initialMembers: selectedMembers.length > 0 ? selectedMembers : undefined,
      });

      Alert.alert('Success', `Group "${groupName}" created successfully!`, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    }
  };

  const renderContactItem = ({ item }: { item: Contact }) => {
    const isSelected = selectedMembers.includes(item.user.id);

    return (
      <TouchableOpacity
        style={[styles.contactItem, isSelected && styles.contactItemSelected]}
        onPress={() => toggleMemberSelection(item.user.id)}
        activeOpacity={0.7}
      >
        <View style={styles.contactAvatar}>
          {item.user.avatar ? (
            <Image source={{ uri: item.user.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.nickname || item.user.name}</Text>
          <Text style={styles.contactEmail}>{item.user.email}</Text>
        </View>

        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <TouchableOpacity
          onPress={handleCreateGroup}
          style={[styles.headerButton, isLoading && styles.headerButtonDisabled]}
          disabled={isLoading}
        >
          <Text style={[styles.headerButtonText, styles.createButtonText]}>
            {isLoading ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Group Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GROUP INFORMATION</Text>

          {/* Group Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Group Name *</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              placeholder="Enter group name"
              placeholderTextColor="#999"
              value={groupName}
              onChangeText={(text) => {
                setGroupName(text);
                setNameError('');
              }}
              maxLength={50}
              testID="group-name-input"
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>

          {/* Description Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's this group about?"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
              testID="group-description-input"
            />
          </View>

          {/* Group Type Selector */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Group Type</Text>
            <View style={styles.groupTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.groupTypeButton,
                  groupType === 'private' && styles.groupTypeButtonActive,
                ]}
                onPress={() => setGroupType('private')}
                testID="private-group-button"
              >
                <Text
                  style={[
                    styles.groupTypeButtonText,
                    groupType === 'private' && styles.groupTypeButtonTextActive,
                  ]}
                >
                  Private
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.groupTypeButton,
                  groupType === 'public' && styles.groupTypeButtonActive,
                ]}
                onPress={() => setGroupType('public')}
                testID="public-group-button"
              >
                <Text
                  style={[
                    styles.groupTypeButtonText,
                    groupType === 'public' && styles.groupTypeButtonTextActive,
                  ]}
                >
                  Public
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              {groupType === 'private'
                ? 'Only invited members can join this group'
                : 'Anyone can discover and join this group'}
            </Text>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ADD MEMBERS</Text>
            {selectedMembers.length > 0 && (
              <Text style={styles.selectedCount}>{selectedMembers.length} selected</Text>
            )}
          </View>

          {/* Search Input */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="member-search-input"
          />

          {/* Contacts List */}
          {filteredContacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? 'No contacts found'
                  : 'No contacts available. Add contacts first to create a group.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredContacts}
              renderItem={renderContactItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={styles.contactsList}
              testID="contacts-list"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
    minWidth: 80,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  createButtonText: {
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  selectedCount: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  groupTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  groupTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  groupTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  groupTypeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  groupTypeButtonTextActive: {
    color: '#fff',
  },
  searchInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    color: '#000',
  },
  contactsList: {
    maxHeight: 400,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  contactAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default CreateGroupScreen;
