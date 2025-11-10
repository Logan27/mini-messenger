import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';

const ProfileScreen = ({ navigation }: any) => {
  const { user, logout, biometricEnabled, enableBiometric, disableBiometric } = useAuthStore();

  // Construct full name from user data
  const getDisplayName = () => {
    if (!user) return 'User';
    if (user.name) return user.name;
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.username) return user.username;
    return user.email || 'User';
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      disableBiometric();
      Alert.alert('Biometric Disabled', 'Biometric authentication has been disabled.');
    } else {
      const success = await enableBiometric();
      if (success) {
        Alert.alert('Biometric Enabled', 'Biometric authentication has been enabled.');
      } else {
        Alert.alert('Biometric Setup Failed', 'Could not enable biometric authentication.');
      }
    }
  };

  const menuItems = [
    {
      title: 'Settings',
      icon: 'settings',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      title: 'Privacy & Security',
      icon: 'shield-checkmark',
      onPress: () => Alert.alert('Privacy & Security', 'Privacy settings coming soon!'),
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      onPress: () => Alert.alert('Notifications', 'Notification settings coming soon!'),
    },
    {
      title: 'Data & Storage',
      icon: 'server',
      onPress: () => Alert.alert('Data & Storage', 'Storage settings coming soon!'),
    },
    {
      title: 'Help & Support',
      icon: 'help-circle',
      onPress: () => Alert.alert('Help & Support', 'Help center coming soon!'),
    },
    {
      title: 'About',
      icon: 'information-circle',
      onPress: () => Alert.alert('About', 'App version 1.0.0'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Text style={styles.avatarText}>{user.avatar}</Text>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#666" />
            </View>
          )}
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{getDisplayName()}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, user?.isOnline ? styles.online : styles.offline]} />
            <Text style={styles.statusText}>
              {user?.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="pencil" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Biometric Authentication Toggle */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.biometricToggle} onPress={handleBiometricToggle}>
          <View style={styles.biometricInfo}>
            <Ionicons name="finger-print" size={24} color="#2563eb" />
            <View style={styles.biometricText}>
              <Text style={styles.biometricTitle}>Biometric Authentication</Text>
              <Text style={styles.biometricSubtitle}>
                {biometricEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          <Ionicons
            name={biometricEnabled ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={biometricEnabled ? '#10b981' : '#ccc'}
          />
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon as any} size={24} color="#2563eb" />
              <Text style={styles.menuItemText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>Messenger v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  online: {
    backgroundColor: '#10b981',
  },
  offline: {
    backgroundColor: '#6b7280',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  editButton: {
    padding: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  biometricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  biometricInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  biometricText: {
    marginLeft: 15,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  biometricSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  logoutText: {
    fontSize: 16,
    color: '#ef4444',
    marginLeft: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
});

export default ProfileScreen;