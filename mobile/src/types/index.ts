// User types
export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatar?: string;
  bio?: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  isApproved: boolean;
  createdAt: string;
  lastSeen?: string;
  isOnline?: boolean;
  profilePicture?: string;
  onlineStatus?: string;
}

// Contact types
export interface Contact {
  id: string;
  status: 'pending' | 'accepted' | 'blocked';
  userId: string; // Request sender
  contactUserId: string; // Request recipient
  nickname?: string;
  notes?: string;
  isFavorite: boolean;
  isMuted: boolean;
  lastContactAt?: string;
  blockedAt?: string;
  user: User;
  createdAt: string;
  updatedAt?: string;
}

export interface ContactRequest {
  id: string;
  status: 'pending';
  userId: string;
  contactUserId: string;
  user: User;
  createdAt: string;
  isIncoming: boolean; // true if current user is recipient
}

// Group types
export interface Group {
  id: string;
  name: string;
  description?: string;
  groupType: 'private' | 'public';
  avatar?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  unreadCount?: number;
  lastMessage?: Message;
  isMuted?: boolean;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  user: User;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  isMuted: boolean;
  addedBy?: string;
}

export interface GroupSettings {
  groupId: string;
  onlyAdminsCanPost: boolean;
  onlyAdminsCanAddMembers: boolean;
  onlyAdminsCanEditInfo: boolean;
  enableReadReceipts: boolean;
  enableTypingIndicators: boolean;
  maxMembers: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Message types
export interface MessageReaction {
  emoji: string;
  users: string[]; // Array of user IDs who reacted
}

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'system';
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
  isRead: boolean;
  readBy?: string[];
  replyTo?: string;
  file?: FileData;
  reactions?: MessageReaction[];
  linkPreview?: LinkPreviewData;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  avatar?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface FileData {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface LoginForm {
  identifier: string; // Can be email or username
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

export interface ForgotPasswordForm {
  email: string;
}

export interface ResetPasswordForm {
  token: string;
  password: string;
  confirmPassword: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Chat: { conversationId: string; contactId?: string };
  Profile: { userId: string };
  EditProfile: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  PrivacySettings: undefined;
  AppearanceSettings: undefined;
  DataStorageSettings: undefined;
  AddContact: undefined;
  UserSearch: undefined;
  ContactRequests: undefined;
  ContactProfile: { contactId: string };
  BlockedContacts: undefined;
  CreateGroup: undefined;
  GroupInfo: { groupId: string };
  TwoFactorAuth: undefined;
  AccountDeletion: undefined;
  DataExport: undefined;
  ConsentManagement: undefined;
  IncomingCall: { call: Call };
  OutgoingCall: { call: Call };
  ActiveCall: { call: Call };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string; email?: string };
  EmailVerification: { email?: string; token?: string; autoVerify?: boolean };
  AccountPending: { email?: string; username?: string };
};

export type MainTabParamList = {
  Conversations: undefined;
  Groups: undefined;
  Contacts: undefined;
  Profile: undefined;
};

// Call types
export interface Call {
  id: string;
  callerId: string;
  recipientId: string;
  callType: 'audio' | 'video';
  status: 'calling' | 'connected' | 'ended' | 'rejected' | 'missed';
  durationSeconds?: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  caller?: User;
  recipient?: User;
}

export interface CallState {
  activeCall: Call | null;
  localStream: any; // MediaStream
  remoteStream: any; // MediaStream
  isMuted: boolean;
  isVideoEnabled: boolean;
  isCallActive: boolean;
}

export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  callId: string;
  sdp?: string;
  candidate?: any;
}

// WebSocket event types
export interface ServerToClientEvents {
  message: (message: Message) => void;
  messageRead: (data: { messageId: string; userId: string }) => void;
  typing: (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  userOnline: (data: { userId: string; isOnline: boolean }) => void;
  conversationUpdate: (conversation: Conversation) => void;
  'call.incoming': (data: { call: Call }) => void;
  'call.response': (data: { call: Call; accepted: boolean }) => void;
  'call.ended': (data: { callId: string; reason?: string }) => void;
  webrtc_offer: (data: { callId: string; sdp: string; callerId: string }) => void;
  webrtc_answer: (data: { callId: string; sdp: string }) => void;
  webrtc_ice_candidate: (data: { callId: string; candidate: any }) => void;
  call_mute: (data: { callId: string; userId: string; muted: boolean }) => void;
  call_video_toggle: (data: { callId: string; userId: string; enabled: boolean }) => void;
}

export interface ClientToServerEvents {
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  typing: (data: { conversationId: string; isTyping: boolean }) => void;
  markAsRead: (data: { conversationId: string; messageId: string }) => void;
  webrtc_offer: (data: { callId: string; sdp: string; recipientId: string }) => void;
  webrtc_answer: (data: { callId: string; sdp: string; callerId: string }) => void;
  webrtc_ice_candidate: (data: { callId: string; candidate: any; targetUserId: string }) => void;
  call_mute: (data: { callId: string; muted: boolean }) => void;
  call_video_toggle: (data: { callId: string; enabled: boolean }) => void;
}

// Push notification types
export interface PushNotificationData {
  type: 'message' | 'call' | 'system';
  conversationId?: string;
  messageId?: string;
  callId?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER: 'user',
  BIOMETRIC_ENABLED: 'biometricEnabled',
  NOTIFICATIONS_ENABLED: 'notificationsEnabled',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

// App configuration
export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  enableBiometric: boolean;
  enableNotifications: boolean;
  maxFileSize: number;
  supportedFileTypes: string[];
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Biometric types
export type BiometricType = 'fingerprint' | 'facial' | 'iris';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: BiometricType;
}