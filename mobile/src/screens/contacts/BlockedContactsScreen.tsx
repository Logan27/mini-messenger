import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContactStore } from '../../stores/contactStore';
import { Contact } from '../../types';

const BlockedContactsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const {
    contacts,
    isLoading,
    error,
    loadContacts,
    unblockContact,
    clearError,
  } = useContactStore();

  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const blockedContacts = contacts.filter(c => c.status === 'blocked');

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const handleRefresh = useCallback(() => {
    loadContacts();
  }, []);

  const handleUnblock = useCallback(async (contact: Contact) => {
    Alert.alert(
      'Unblock Contact',
      `Are you sure you want to unblock ${contact.user.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            setUnblockingId(contact.id);
            try {
              await unblockContact(contact.id);
              Alert.alert(
                'Success',
                `${contact.user.name} has been unblocked`
              );
            } catch (err) {
              // Error handled by store
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ]
    );
  }, [unblockContact]);

  const renderBlockedContact = ({ item }: { item: Contact }) => {
    const isUnblocking = unblockingId === item.id;
    const initials = (item.user.name || 'U').slice(0, 2).toUpperCase();

    return (
      <View style={styles.contactItem}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>
            {item.nickname || item.user.name}
          </Text>
          {item.nickname && (
            <Text style={styles.contactActualName}>{item.user.name}</Text>
          )}
          <Text style={styles.contactEmail}>{item.user.email}</Text>
          {item.blockedAt && (
            <Text style={styles.blockedDate}>
              Blocked {new Date(item.blockedAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.unblockButton, isUnblocking && styles.unblockButtonDisabled]}
          onPress={() => handleUnblock(item)}
          disabled={isUnblocking}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <>
              <Ionicons name="lock-open" size={18} color="#2563eb" />
              <Text style={styles.unblockButtonText}>Unblock</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return null;
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="ban" size={64} color="#d1d5db" />
        <Text style={styles.emptyStateTitle}>No Blocked Contacts</Text>
        <Text style={styles.emptyStateText}>
          You haven't blocked anyone yet
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Contacts</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Info Banner */}
      {blockedContacts.length > 0 && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#2563eb" />
          <Text style={styles.infoBannerText}>
            Blocked contacts can't send you messages or call you
          </Text>
        </View>
      )}

      {/* Blocked Contacts List */}
      {isLoading && blockedContacts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading blocked contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={blockedContacts}
          renderItem={renderBlockedContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              colors={['#2563eb']}
            />
          }
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
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 24,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderRadius: 8,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  contactActualName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 2,
  },
  blockedDate: {
    fontSize: 12,
    color: '#ef4444',
    fontStyle: 'italic',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  unblockButtonDisabled: {
    opacity: 0.6,
  },
  unblockButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default BlockedContactsScreen;
