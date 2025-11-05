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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Group } from '../../types';
import { useGroupStore } from '../../stores/groupStore';
import { useAuthStore } from '../../stores/authStore';

type GroupsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const GroupsScreen: React.FC = () => {
  const navigation = useNavigation<GroupsScreenNavigationProp>();
  const { user } = useAuthStore();
  const { groups, isLoading, error, loadUserGroups } = useGroupStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'private' | 'public'>('all');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      await loadUserGroups(1, 50, undefined, filterType === 'all' ? undefined : filterType);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  }, [filterType]);

  const handleGroupPress = (group: Group) => {
    navigation.navigate('GroupInfo', { groupId: group.id });
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = async (type: 'all' | 'private' | 'public') => {
    setFilterType(type);
    await loadUserGroups(1, 50, searchQuery || undefined, type === 'all' ? undefined : type);
  };

  const filteredGroups = groups.filter((group) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(searchLower) ||
      group.description?.toLowerCase().includes(searchLower)
    );
  });

  const renderGroup = ({ item: group }: { item: Group }) => {
    return (
      <TouchableOpacity
        style={styles.groupItem}
        onPress={() => handleGroupPress(group)}
        activeOpacity={0.7}
      >
        <View style={styles.groupAvatar}>
          {group.avatar ? (
            <Image source={{ uri: group.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {group.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
          )}
          {group.isMuted && (
            <View style={styles.mutedIndicator}>
              <Ionicons name="volume-mute" size={12} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.groupInfo}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupName} numberOfLines={1}>
              {group.name}
            </Text>
            <View style={styles.groupTypeContainer}>
              <Ionicons
                name={group.groupType === 'public' ? 'globe-outline' : 'lock-closed-outline'}
                size={12}
                color="#666"
              />
              <Text style={styles.groupTypeText}>
                {group.groupType === 'public' ? 'Public' : 'Private'}
              </Text>
            </View>
          </View>

          {group.description && (
            <Text style={styles.groupDescription} numberOfLines={1}>
              {group.description}
            </Text>
          )}

          <View style={styles.groupMeta}>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.groupMetaText}>{group.memberCount} members</Text>
            {group.lastMessage && (
              <>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.lastMessageTime}>
                  {formatTimestamp(group.lastMessage.createdAt)}
                </Text>
              </>
            )}
          </View>
        </View>

        {group.unreadCount && group.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{group.unreadCount}</Text>
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

  if (error && !groups.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Groups</Text>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadGroups}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity onPress={handleCreateGroup} style={styles.createButton}>
          <Ionicons name="add-circle" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'private' && styles.filterTabActive]}
          onPress={() => handleFilterChange('private')}
        >
          <Ionicons
            name="lock-closed-outline"
            size={14}
            color={filterType === 'private' ? '#007AFF' : '#666'}
            style={styles.filterIcon}
          />
          <Text style={[styles.filterTabText, filterType === 'private' && styles.filterTabTextActive]}>
            Private
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'public' && styles.filterTabActive]}
          onPress={() => handleFilterChange('public')}
        >
          <Ionicons
            name="globe-outline"
            size={14}
            color={filterType === 'public' ? '#007AFF' : '#666'}
            style={styles.filterIcon}
          />
          <Text style={[styles.filterTabText, filterType === 'public' && styles.filterTabTextActive]}>
            Public
          </Text>
        </TouchableOpacity>
      </View>

      {/* Groups List */}
      <FlatList
        data={filteredGroups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.emptyText}>Loading groups...</Text>
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No groups yet</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'No groups match your search'
                  : 'Create or join a group to get started'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.createGroupButton} onPress={handleCreateGroup}>
                  <Text style={styles.createGroupButtonText}>Create Group</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        contentContainerStyle={filteredGroups.length === 0 ? styles.emptyContainer : undefined}
      />
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  createButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    color: '#000',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#e6f2ff',
  },
  filterIcon: {
    marginRight: 4,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#007AFF',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  mutedIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#999',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  groupTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupTypeText: {
    fontSize: 12,
    color: '#666',
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupMetaText: {
    fontSize: 13,
    color: '#666',
  },
  separator: {
    fontSize: 13,
    color: '#999',
    marginHorizontal: 4,
  },
  lastMessageTime: {
    fontSize: 13,
    color: '#999',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  createGroupButton: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createGroupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GroupsScreen;
