import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';

const DrawerMenu: React.FC<DrawerContentComponentProps> = (props) => {
  const { user, logout } = useAuthStore();
  const { appearance, setTheme } = useSettingsStore();
  const theme = appearance.theme;

  const handleLogout = async () => {
    await logout();
  };

  const toggleTheme = async () => {
    // Toggle between light and dark (ignore system for now)
    console.log('[DrawerMenu] Current theme:', theme);
    const newTheme = (theme === 'dark') ? 'light' : 'dark';
    console.log('[DrawerMenu] Setting theme to:', newTheme);
    await setTheme(newTheme);
    console.log('[DrawerMenu] Theme set complete');
  };

  const getInitials = () => {
    if (!user || !user.username) return 'U';
    return user.username.substring(0, 2).toUpperCase();
  };

  // Resolve 'system' theme to actual light/dark based on device settings
  const isDark = theme === 'dark' || (theme === 'system' && false); // TODO: Use Appearance.getColorScheme() for system
  const colors = {
    background: isDark ? '#1a1a1a' : '#ffffff',
    card: isDark ? '#2a2a2a' : '#f8f9fa',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#a0a0a0' : '#666666',
    border: isDark ? '#3a3a3a' : '#e0e0e0',
    primary: '#2563eb',
    accent: isDark ? '#333333' : '#f0f0f0',
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* User Profile Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.avatarContainer}>
          {user?.profilePicture || user?.avatar ? (
            <Image
              source={{
                uri: (() => {
                  const avatarUrl = user.profilePicture || user.avatar;
                  if (!avatarUrl) return '';
                  return avatarUrl.startsWith('http') ? avatarUrl : `http://localhost:4000${avatarUrl}`;
                })()
              }}
              style={styles.avatar}
              onError={(error) => console.log('Avatar load error:', error.nativeEvent.error)}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
            {user?.username}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
      </View>

      <View style={[styles.separator, { backgroundColor: colors.border }]} />

      {/* Settings */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => props.navigation.navigate('Settings')}
      >
        <Ionicons name="settings-outline" size={22} color={colors.text} />
        <Text style={[styles.menuItemText, { color: colors.text }]}>Settings</Text>
      </TouchableOpacity>

      <View style={[styles.separator, { backgroundColor: colors.border }]} />

      {/* Night Mode Toggle */}
      <View style={styles.menuItem}>
        <Ionicons
          name={isDark ? 'moon' : 'sunny'}
          size={22}
          color={colors.text}
        />
        <Text style={[styles.menuItemText, { color: colors.text }]}>Night Mode</Text>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#d1d5db', true: '#60a5fa' }}
          thumbColor={isDark ? '#2563eb' : '#f3f4f6'}
        />
      </View>

      <View style={[styles.separator, { backgroundColor: colors.border }]} />

      {/* Admin Dashboard (if admin) */}
      {user?.role === 'admin' && (
        <>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              // Navigate to admin dashboard if implemented
              // props.navigation.navigate('AdminDashboard');
            }}
          >
            <Ionicons name="shield-checkmark" size={22} color="#3b82f6" />
            <Text style={[styles.menuItemText, { color: '#3b82f6' }]}>
              Admin Dashboard
            </Text>
          </TouchableOpacity>
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        </>
      )}

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Sign Out</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  separator: {
    height: 1,
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    flex: 1,
  },
});

export default DrawerMenu;
