import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { RootStackParamList, MainTabParamList, AuthStackParamList } from '../types';
import { navigationRef } from '../services/navigationService';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import AccountPendingScreen from '../screens/auth/AccountPendingScreen';
import ConversationsScreen from '../screens/messaging/ConversationsScreen';
import ChatScreen from '../screens/messaging/ChatScreen';
import ContactsListScreen from '../screens/contacts/ContactsListScreen';
import AddContactScreen from '../screens/contacts/AddContactScreen';
import ContactRequestsScreen from '../screens/contacts/ContactRequestsScreen';
import ContactProfileScreen from '../screens/contacts/ContactProfileScreen';
import GroupsScreen from '../screens/groups/GroupsScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import GroupInfoScreen from '../screens/groups/GroupInfoScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
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
const Tab = createBottomTabNavigator<MainTabParamList>();
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

// Main Tab Navigator
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Conversations') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Groups') {
            iconName = focused ? 'people-circle' : 'people-circle-outline';
          } else if (route.name === 'Contacts') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{ tabBarLabel: 'Chats' }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ tabBarLabel: 'Groups' }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsListScreen}
        options={{ tabBarLabel: 'Contacts' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Main Stack Navigator (includes tabs and modals)
const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: true,
          headerTitle: 'Chat',
        }}
      />
      <Stack.Screen
        name="AddContact"
        component={AddContactScreen}
      />
      <Stack.Screen
        name="ContactRequests"
        component={ContactRequestsScreen}
      />
      <Stack.Screen
        name="ContactProfile"
        component={ContactProfileScreen}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
      />
      <Stack.Screen
        name="GroupInfo"
        component={GroupInfoScreen}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
      />
      <Stack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
      />
      <Stack.Screen
        name="AppearanceSettings"
        component={AppearanceSettingsScreen}
      />
      <Stack.Screen
        name="DataStorageSettings"
        component={DataStorageSettingsScreen}
      />
      <Stack.Screen
        name="UserSearch"
        component={UserSearchScreen}
      />
      <Stack.Screen
        name="BlockedContacts"
        component={BlockedContactsScreen}
      />
      <Stack.Screen
        name="TwoFactorAuth"
        component={TwoFactorAuthScreen}
      />
      <Stack.Screen
        name="AccountDeletion"
        component={AccountDeletionScreen}
      />
      <Stack.Screen
        name="DataExport"
        component={DataExportScreen}
      />
      <Stack.Screen
        name="ConsentManagement"
        component={ConsentManagementScreen}
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
    // You can create a loading screen here
    return null;
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

export default AppNavigator;