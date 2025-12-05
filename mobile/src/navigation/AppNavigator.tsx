import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { RootStackParamList, AuthStackParamList } from '../types';
import { navigationRef } from '../services/navigationService';
import DrawerMenu from '../components/common/DrawerMenu';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import AccountPendingScreen from '../screens/auth/AccountPendingScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/messaging/ChatScreen';
import AddContactScreen from '../screens/contacts/AddContactScreen';
import ContactRequestsScreen from '../screens/contacts/ContactRequestsScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import GroupInfoScreen from '../screens/groups/GroupInfoScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import SecuritySettingsScreen from '../screens/settings/SecuritySettingsScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import PrivacySettingsScreen from '../screens/settings/PrivacySettingsScreen';
import AppearanceSettingsScreen from '../screens/settings/AppearanceSettingsScreen';
import DataStorageSettingsScreen from '../screens/settings/DataStorageSettingsScreen';
import BlockedContactsScreen from '../screens/contacts/BlockedContactsScreen';
import AccountDeletionScreen from '../screens/settings/AccountDeletionScreen';
import TwoFactorAuthScreen from '../screens/settings/TwoFactorAuthScreen';
import UserSearchScreen from '../screens/contacts/UserSearchScreen';
import DataExportScreen from '../screens/settings/DataExportScreen';
import ConsentManagementScreen from '../screens/settings/ConsentManagementScreen';
import IncomingCallScreen from '../screens/calls/IncomingCallScreen';
import OutgoingCallScreen from '../screens/calls/OutgoingCallScreen';
import ActiveCallScreen from '../screens/calls/ActiveCallScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator();
const AuthStack = createStackNavigator<AuthStackParamList>();

// Auth Navigator
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <AuthStack.Screen name="AccountPending" component={AccountPendingScreen} />
    </AuthStack.Navigator>
  );
};

// Main Drawer Navigator
const MainDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerMenu {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: 280,
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{ drawerLabel: 'Messages' }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ drawerLabel: 'Profile' }}
      />
    </Drawer.Navigator>
  );
};

// Main Stack Navigator (includes drawer and modals)
const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainDrawer" component={MainDrawerNavigator} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AddContact"
        component={AddContactScreen}
        options={{
          headerShown: true,
          headerTitle: 'Add Contact',
        }}
      />
      <Stack.Screen
        name="ContactRequests"
        component={ContactRequestsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Contact Requests',
        }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{
          headerShown: true,
          headerTitle: 'Create Group',
        }}
      />
      <Stack.Screen
        name="GroupInfo"
        component={GroupInfoScreen}
        options={{
          headerShown: true,
          headerTitle: 'Group Info',
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          headerShown: true,
          headerTitle: 'Edit Profile',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="SecuritySettings"
        component={SecuritySettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Security',
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Notifications',
        }}
      />
      <Stack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Privacy',
        }}
      />
      <Stack.Screen
        name="AppearanceSettings"
        component={AppearanceSettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Appearance',
        }}
      />
      <Stack.Screen
        name="DataStorageSettings"
        component={DataStorageSettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Data & Storage',
        }}
      />
      <Stack.Screen
        name="UserSearch"
        component={UserSearchScreen}
        options={{
          headerShown: true,
          headerTitle: 'Search Users',
        }}
      />
      <Stack.Screen
        name="BlockedContacts"
        component={BlockedContactsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Blocked Contacts',
        }}
      />
      <Stack.Screen
        name="TwoFactorAuth"
        component={TwoFactorAuthScreen}
        options={{
          headerShown: true,
          headerTitle: 'Two-Factor Authentication',
        }}
      />
      <Stack.Screen
        name="AccountDeletion"
        component={AccountDeletionScreen}
        options={{
          headerShown: true,
          headerTitle: 'Delete Account',
        }}
      />
      <Stack.Screen
        name="DataExport"
        component={DataExportScreen}
        options={{
          headerShown: true,
          headerTitle: 'Export Data',
        }}
      />
      <Stack.Screen
        name="ConsentManagement"
        component={ConsentManagementScreen}
        options={{
          headerShown: true,
          headerTitle: 'Consent Management',
        }}
      />
      <Stack.Screen
        name="IncomingCall"
        component={IncomingCallScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="OutgoingCall"
        component={OutgoingCallScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ActiveCall"
        component={ActiveCallScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

// Root Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    // Show a simple loading screen instead of null
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});

export default AppNavigator;