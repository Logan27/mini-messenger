// User and Authentication Types
export interface User {
  id: string
  email: string
  username: string
  name: string
  avatar?: string
  bio?: string
  role: 'user' | 'admin'
  isApproved: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterCredentials {
  username: string
  email: string
  password: string
  confirmPassword: string
  name: string
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken: string
}

// Message and Conversation Types
export interface Message {
  id: string
  conversationId: string
  senderId: string
  sender?: User
  content: string
  encryptedContent?: string
  type: 'text' | 'file' | 'image' | 'system'
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  replyToId?: string
  replyTo?: Message
  editedAt?: string
  deletedAt?: string
  reactions?: MessageReaction[]
  readBy?: ReadReceipt[]
  createdAt: string
  updatedAt: string
  metadata?: {
    fileName?: string
    fileSize?: number
    mimeType?: string
    imageDimensions?: { width: number; height: number }
  }
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  name?: string
  description?: string
  avatar?: string
  participants: User[]
  lastMessage?: Message
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export interface MessageState {
  conversations: Conversation[]
  currentConversationId: string | null
  messages: Record<string, Message[]>
  isLoading: boolean
  error: string | null
  hasMoreMessages: Record<string, boolean>
  typingUsers: Record<string, User[]>
}

// UI State Types
export interface ModalState {
  isOpen: boolean
  type: 'login' | 'register' | 'profile' | 'forgotPassword' | 'resetPassword' | null
  data?: any
}

export interface NotificationItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  persistent?: boolean
  actions?: Array<{
    label: string
    action: () => void
  }>
}

export interface UIState {
  modals: ModalState
  notifications: NotificationItem[]
  isLoading: boolean
  loadingMessage?: string
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean
}

// Form Types
export interface FormErrors {
  [key: string]: string | undefined
}

export interface PasswordStrength {
  score: number
  feedback: string[]
  isValid: boolean
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// WebSocket Event Types
export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: string
}

export interface TypingEvent {
  conversationId: string
  userId: string
  isTyping: boolean
}

export interface MessageStatusEvent {
  messageId: string
  status: Message['status']
  userId: string
}

export interface MessageReaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: string
}

export interface ReadReceipt {
  userId: string
  readAt: string
  user?: User
}

export interface GroupMember {
  id: string
  userId: string
  groupId: string
  role: 'admin' | 'member'
  joinedAt: string
  user?: User
}

export interface Group {
  id: string
  name: string
  description?: string
  avatar?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  members: GroupMember[]
  memberCount: number
}

export interface SearchFilters {
  query: string
  conversationId?: string
  senderId?: string
  messageType?: Message['type']
  dateFrom?: string
  dateTo?: string
}

export interface SearchResult {
  message: Message
  conversation: Conversation
  highlights: string[]
}

// File Types
export interface FileUpload {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled'
  error?: string
  url?: string
  thumbnail?: string
}

export interface FileMessage extends Message {
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  thumbnail?: string
  dimensions?: { width: number; height: number }
}

export interface FileValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Contact Types
export interface Contact {
  id: string
  userId: string
  contactUserId: string
  status: 'pending' | 'accepted' | 'blocked'
  nickname?: string
  category?: string
  isMuted: boolean
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  user?: User
  contactUser?: User
  lastSeen?: string
  isOnline?: boolean
}

export interface ContactState {
  contacts: Contact[]
  pendingRequests: Contact[]
  blockedUsers: Contact[]
  isLoading: boolean
  error: string | null
}

// User Profile Types
export interface UserProfile extends User {
  isOnline: boolean
  lastSeen: string
  mutualContacts: User[]
  mutualGroups: Group[]
  sharedMedia: FileMessage[]
  bio?: string
  location?: string
  website?: string
  joinedAt: string
}

export interface UserSearchFilters {
  query: string
  isOnline?: boolean
  hasMutualContacts?: boolean
  location?: string
  joinedAfter?: string
  joinedBefore?: string
}

export interface UserSearchResult {
  user: UserProfile
  mutualContacts: User[]
  mutualGroups: Group[]
  canAddAsContact: boolean
}

// Call Types
export interface CallParticipant {
  id: string
  userId: string
  user: User
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  joinedAt: string
  leftAt?: string
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected'
}

export interface Call {
  id: string
  type: 'audio' | 'video'
  status: 'initiating' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed' | 'missed'
  initiatorId: string
  initiator: User
  participants: CallParticipant[]
  startedAt?: string
  endedAt?: string
  duration?: number
  maxParticipants: number
  isGroupCall: boolean
  conversationId?: string
  metadata?: {
    topic?: string
    description?: string
    scheduledFor?: string
  }
}

export interface CallState {
  currentCall: Call | null
  incomingCall: Call | null
  callHistory: Call[]
  isLoading: boolean
  error: string | null
  isIncomingCallModalOpen: boolean
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  selectedAudioDevice?: string
  selectedVideoDevice?: string
  availableDevices: {
    audioInputs: MediaDeviceInfo[]
    videoInputs: MediaDeviceInfo[]
    audioOutputs: MediaDeviceInfo[]
  }
}

export interface CallSettings {
  enableVideoByDefault: boolean
  enableAudioByDefault: boolean
  autoAcceptCalls: boolean
  ringtoneEnabled: boolean
  vibrationEnabled: boolean
  callTimeout: number // seconds
  maxCallDuration: number // minutes
  preferredAudioDevice?: string
  preferredVideoDevice?: string
  enableScreenShare: boolean
  enableRecording: boolean
}

// WebRTC Types
export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-initiate' | 'call-accept' | 'call-decline' | 'call-end'
  callId: string
  fromUserId: string
  toUserId?: string
  data?: any
  timestamp: string
}

export interface ICECandidateData {
  candidate: string
  sdpMLineIndex: number
  sdpMid: string
}

export interface WebRTCConnection {
  peerConnection: RTCPeerConnection
  dataChannel?: RTCDataChannel
  isConnected: boolean
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected'
  lastActivity: number
  retryCount: number
}

export interface MediaConstraints {
  audio: boolean | MediaTrackConstraints
  video: boolean | MediaTrackConstraints
  screen?: boolean | DisplayMediaStreamOptions
}

export interface CallError {
  code: 'PERMISSION_DENIED' | 'DEVICE_NOT_FOUND' | 'CONNECTION_FAILED' | 'SIGNALING_ERROR' | 'WEBRTC_ERROR' | 'TIMEOUT'
  message: string
  details?: any
}

// Call History Types
export interface CallHistoryFilters {
  type?: 'all' | 'audio' | 'video' | 'missed' | 'received' | 'outgoing'
  participant?: string
  dateFrom?: string
  dateTo?: string
  duration?: 'short' | 'medium' | 'long' // <1min, 1-10min, >10min
}

export interface CallHistoryItem {
  call: Call
  participant: User
  isMissed: boolean
  isIncoming: boolean
  canCallAgain: boolean
}

export interface CallStats {
  totalCalls: number
  totalDuration: number
  averageDuration: number
  missedCalls: number
  audioCalls: number
  videoCalls: number
  successRate: number
}

// Call Events
export interface CallEvent {
  type: 'call_initiated' | 'call_received' | 'call_accepted' | 'call_declined' | 'call_ended' | 'participant_joined' | 'participant_left' | 'call_failed'
  callId: string
  userId: string
  timestamp: string
  data?: any
}

// Admin Types
export interface AdminStats {
  totalUsers: number
  activeUsers: number
  pendingUsers: number
  totalMessages: number
  storageUsed: number
  serverStatus: 'online' | 'offline' | 'maintenance'
  databaseConnections: number
  websocketConnections: number
  uptime: number
}

export interface AdminUser extends User {
  lastLoginAt?: string
  loginCount: number
  isOnline: boolean
  lastSeenAt?: string
  registrationIP?: string
  lastLoginIP?: string
  deviceInfo?: {
    browser?: string
    os?: string
    device?: string
  }
  violations: UserViolation[]
  activityScore: number
}

export interface UserViolation {
  id: string
  userId: string
  type: 'spam' | 'harassment' | 'inappropriate_content' | 'suspicious_activity' | 'terms_violation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  reportedBy?: string
  reportedAt: string
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed'
  actions?: string[]
  evidence?: string[]
}

export interface AdminActivity {
  id: string
  adminId: string
  action: string
  targetType: 'user' | 'message' | 'group' | 'system'
  targetId: string
  details: string
  ipAddress: string
  userAgent: string
  timestamp: string
  admin?: User
}

export interface PendingUser extends Omit<User, 'role'> {
  registrationIP: string
  registrationDate: string
  approvalStatus: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  reviewedBy?: string
  reviewedAt?: string
  riskScore: number
  flags: string[]
}

export interface AdminFilters {
  status?: 'all' | 'pending' | 'approved' | 'rejected'
  role?: 'all' | 'user' | 'admin'
  dateFrom?: string
  dateTo?: string
  search?: string
  riskLevel?: 'low' | 'medium' | 'high'
  hasViolations?: boolean
  isOnline?: boolean
}

export interface BulkAction {
  type: 'approve' | 'reject' | 'suspend' | 'delete' | 'warn' | 'reset_password'
  targetIds: string[]
  reason?: string
  duration?: number // for suspensions
}

// Notification Types
export interface Notification {
  id: string
  userId: string
  type: 'message' | 'call' | 'mention' | 'admin' | 'system' | 'security' | 'update'
  title: string
  message: string
  data?: Record<string, any>
  isRead: boolean
  isArchived: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: 'social' | 'system' | 'security' | 'admin'
  expiresAt?: string
  createdAt: string
  readAt?: string
  actions?: NotificationAction[]
  relatedUser?: User
  relatedConversation?: Conversation
  relatedCall?: Call
}

export interface NotificationAction {
  id: string
  label: string
  type: 'navigate' | 'api_call' | 'modal' | 'external'
  data?: any
  primary?: boolean
}

export interface NotificationSettings {
  userId: string
  enabledTypes: Notification['type'][]
  disabledTypes: Notification['type'][]
  soundEnabled: boolean
  desktopNotifications: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  quietHours: {
    enabled: boolean
    startTime: string // HH:mm format
    endTime: string // HH:mm format
    timezone: string
  }
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  categories: {
    social: boolean
    system: boolean
    security: boolean
    admin: boolean
  }
}

export interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  settings: NotificationSettings | null
  hasMore: boolean
  lastFetched?: string
}

// Loading and Error Types
export interface LoadingState {
  isLoading: boolean
  message?: string
  progress?: number
}

export interface ErrorState {
  hasError: boolean
  message: string
  code?: string
  details?: any
  retryable: boolean
  timestamp: string
}

// Empty State Types
export interface EmptyStateConfig {
  icon?: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

// Confirmation Dialog Types
export interface ConfirmationDialogConfig {
  isOpen: boolean
  title: string
  message: string
  type: 'info' | 'warning' | 'danger' | 'success'
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: 'default' | 'destructive'
  loading?: boolean
}

// Chart and Analytics Types
export interface ChartDataPoint {
  label: string
  value: number
  date?: string
  category?: string
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'doughnut'
  data: ChartDataPoint[]
  colors?: string[]
  showLegend?: boolean
  showGrid?: boolean
  height?: number
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  uptime: number
  responseTime: number
  database: {
    status: 'connected' | 'disconnected' | 'error'
    connections: number
    queryTime: number
  }
  websocket: {
    status: 'connected' | 'disconnected' | 'error'
    connections: number
  }
  storage: {
    used: number
    available: number
    percentage: number
  }
}