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
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, GroupMember } from '../../types';
import { useGroupStore } from '../../stores/groupStore';
import { useAuthStore } from '../../stores/authStore';

type GroupInfoScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GroupInfo'>;
type GroupInfoScreenRouteProp = RouteProp<RootStackParamList, 'GroupInfo'>;

interface GroupInfoScreenProps {
  navigation: GroupInfoScreenNavigationProp;
  route: GroupInfoScreenRouteProp;
}

const GroupInfoScreen: React.FC<GroupInfoScreenProps> = ({ navigation, route }) => {
  const { groupId } = route.params;
  const {
    selectedGroup,
    groupMembers,
    groupSettings,
    isLoading,
    getGroup,
    loadGroupMembers,
    loadGroupSettings,
    updateGroup,
    deleteGroup,
    leaveGroup,
    muteGroup,
    unmuteGroup,
    removeGroupMember,
    updateMemberRole,
    updateGroupSettings,
  } = useGroupStore();
  const { user: currentUser } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      await Promise.all([
        getGroup(groupId),
        loadGroupMembers(groupId),
        loadGroupSettings(groupId),
      ]);
    } catch (error) {
      console.error('Error loading group data:', error);
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      setEditedName(selectedGroup.name);
      setEditedDescription(selectedGroup.description || '');
    }
  }, [selectedGroup]);

  const currentUserMember = (groupMembers[groupId] || []).find(
    (m) => m.userId === currentUser?.id
  );

  const isAdmin = currentUserMember?.role === 'admin';
  const isModerator = currentUserMember?.role === 'moderator' || isAdmin;
  const members = groupMembers[groupId] || [];
  const settings = groupSettings[groupId];

  const handleSaveEdit = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }

    try {
      await updateGroup(groupId, {
        name: editedName.trim(),
        description: editedDescription.trim() || undefined,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Group information updated');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update group');
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${selectedGroup?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(groupId);
              Alert.alert('Left Group', 'You have left the group');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${selectedGroup?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(groupId);
              Alert.alert('Group Deleted', 'The group has been deleted');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete group');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (member: GroupMember) => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.user.name} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeGroupMember(groupId, member.userId);
              Alert.alert('Success', 'Member removed from group');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = (member: GroupMember) => {
    const roles: Array<'admin' | 'moderator' | 'member'> = ['admin', 'moderator', 'member'];
    const roleOptions = roles.map((role) => ({
      text: role.charAt(0).toUpperCase() + role.slice(1),
      onPress: async () => {
        try {
          await updateMemberRole(groupId, member.userId, role);
          Alert.alert('Success', `Member role updated to ${role}`);
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to update role');
        }
      },
    }));

    Alert.alert('Change Role', `Select a new role for ${member.user.name}`, [
      ...roleOptions,
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleToggleMute = async () => {
    try {
      if (selectedGroup?.isMuted) {
        await unmuteGroup(groupId);
      } else {
        await muteGroup(groupId);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update mute status');
    }
  };

  const handleUpdateSettings = async (settingKey: string, value: boolean) => {
    try {
      await updateGroupSettings(groupId, { [settingKey]: value });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update settings');
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return styles.roleBadgeAdmin;
      case 'moderator':
        return styles.roleBadgeModerator;
      default:
        return styles.roleBadgeMember;
    }
  };

  const renderMemberItem = ({ item }: { item: GroupMember }) => {
    const isCurrentUser = item.userId === currentUser?.id;
    const canModify = isAdmin && !isCurrentUser;

    return (
      <TouchableOpacity
        style={styles.memberItem}
        onLongPress={() => canModify && handleRemoveMember(item)}
        disabled={!canModify}
        activeOpacity={0.7}
      >
        <View style={styles.memberAvatar}>
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

        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>
              {item.user.name}
              {isCurrentUser && ' (You)'}
            </Text>
            <View style={[styles.roleBadge, getRoleBadgeStyle(item.role)]}>
              <Text style={styles.roleText}>{item.role}</Text>
            </View>
          </View>
          <Text style={styles.memberEmail}>{item.user.email}</Text>
        </View>

        {canModify && (
          <TouchableOpacity onPress={() => handleChangeRole(item)} style={styles.moreButton}>
            <Text style={styles.moreButtonText}>⋯</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && !selectedGroup) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading group info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedGroup) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Group not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Info</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Group Header */}
        <View style={styles.groupHeader}>
          <View style={styles.groupAvatar}>
            {selectedGroup.avatar ? (
              <Image source={{ uri: selectedGroup.avatar }} style={styles.groupAvatarImage} />
            ) : (
              <View style={styles.groupAvatarPlaceholder}>
                <Text style={styles.groupAvatarText}>
                  {selectedGroup.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              </View>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.editInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Group name"
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.editInput, styles.editTextArea]}
                value={editedDescription}
                onChangeText={setEditedDescription}
                placeholder="Description (optional)"
                placeholderTextColor="#999"
                multiline
                numberOfLines={2}
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEdit} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.groupName}>{selectedGroup.name}</Text>
              {selectedGroup.description && (
                <Text style={styles.groupDescription}>{selectedGroup.description}</Text>
              )}
              <Text style={styles.groupMeta}>
                {selectedGroup.groupType === 'public' ? 'Public Group' : 'Private Group'} • {selectedGroup.memberCount} members
              </Text>
              {isAdmin && (
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                  <Text style={styles.editButtonText}>Edit Group Info</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionItem} onPress={handleToggleMute}>
            <Text style={styles.actionText}>
              {selectedGroup.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
            </Text>
            <Switch
              value={selectedGroup.isMuted}
              onValueChange={handleToggleMute}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            />
          </TouchableOpacity>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MEMBERS ({members.length})</Text>
            {isModerator && (
              <TouchableOpacity style={styles.addMemberButton}>
                <Text style={styles.addMemberText}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={members}
            renderItem={renderMemberItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Settings Section (Admin Only) */}
        {isAdmin && settings && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowSettings(!showSettings)}
            >
              <Text style={styles.sectionTitle}>GROUP SETTINGS</Text>
              <Text style={styles.toggleIcon}>{showSettings ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {showSettings && (
              <>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Only admins can post</Text>
                  <Switch
                    value={settings.onlyAdminsCanPost}
                    onValueChange={(value) => handleUpdateSettings('onlyAdminsCanPost', value)}
                    trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                  />
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Only admins can add members</Text>
                  <Switch
                    value={settings.onlyAdminsCanAddMembers}
                    onValueChange={(value) => handleUpdateSettings('onlyAdminsCanAddMembers', value)}
                    trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                  />
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Only admins can edit info</Text>
                  <Switch
                    value={settings.onlyAdminsCanEditInfo}
                    onValueChange={(value) => handleUpdateSettings('onlyAdminsCanEditInfo', value)}
                    trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                  />
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Enable read receipts</Text>
                  <Switch
                    value={settings.enableReadReceipts}
                    onValueChange={(value) => handleUpdateSettings('enableReadReceipts', value)}
                    trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                  />
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Enable typing indicators</Text>
                  <Switch
                    value={settings.enableTypingIndicators}
                    onValueChange={(value) => handleUpdateSettings('enableTypingIndicators', value)}
                    trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                  />
                </View>
              </>
            )}
          </View>
        )}

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DANGER ZONE</Text>

          <TouchableOpacity style={styles.dangerButton} onPress={handleLeaveGroup}>
            <Text style={styles.dangerButtonText}>Leave Group</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteGroup}>
              <Text style={styles.dangerButtonText}>Delete Group</Text>
            </TouchableOpacity>
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
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  groupHeader: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  groupAvatar: {
    marginBottom: 16,
  },
  groupAvatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  groupAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '600',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  groupDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  groupMeta: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  editButtonText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  editForm: {
    width: '100%',
    marginTop: 16,
  },
  editInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
  },
  editTextArea: {
    minHeight: 60,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
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
  toggleIcon: {
    fontSize: 12,
    color: '#666',
  },
  addMemberButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  addMemberText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
    color: '#000',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberAvatar: {
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
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  roleBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  roleBadgeAdmin: {
    backgroundColor: '#ff3b30',
  },
  roleBadgeModerator: {
    backgroundColor: '#ff9500',
  },
  roleBadgeMember: {
    backgroundColor: '#34c759',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
  },
  moreButton: {
    padding: 8,
  },
  moreButtonText: {
    fontSize: 20,
    color: '#666',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#000',
  },
  dangerButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  dangerButtonText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default GroupInfoScreen;
