// Test helpers for React Native testing
import { Alert } from 'react-native';

// Mock data for testing
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'TU',
  role: 'user' as const,
  isApproved: true,
  createdAt: '2024-01-01T00:00:00Z',
  isOnline: true,
};

export const mockConversation = {
  id: 'conv-1',
  type: 'direct' as const,
  participants: [mockUser],
  unreadCount: 2,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: mockUser.id,
};

export const mockMessage = {
  id: 'msg-1',
  conversationId: mockConversation.id,
  senderId: mockUser.id,
  content: 'Hello, world!',
  type: 'text' as const,
  createdAt: '2024-01-01T00:00:00Z',
  isRead: false,
  readBy: [],
};

// Mock API responses
export const mockApiResponse = <T>(data: T) => ({
  success: true,
  data,
  message: 'Success',
});

export const mockApiError = (message: string) => ({
  success: false,
  message,
  errors: {},
});

// Test utilities
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const mockAlert = {
  alert: jest.fn(),
  prompt: jest.fn(),
  confirm: jest.fn(),
};

// Mock AsyncStorage
export const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
};

// Mock navigation
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
};

// Performance testing helpers
export const measurePerformance = async (name: string, fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};

// Memory usage testing
export const getMemoryUsage = () => {
  if (Platform.OS === 'android') {
    // On Android, we can use the meminfo
    return 'Memory usage tracking not implemented for Android';
  } else if (Platform.OS === 'ios') {
    // On iOS, we might use device info
    return 'Memory usage tracking not implemented for iOS';
  }
  return 'Platform not supported';
};

// Network testing helpers
export const mockNetworkStates = {
  online: { isConnected: true, isInternetReachable: true },
  offline: { isConnected: false, isInternetReachable: false },
  slowConnection: { isConnected: true, isInternetReachable: true, type: 'cellular' },
};

// Battery testing helpers
export const mockBatteryStates = {
  high: { level: 0.9, state: 'charging' },
  medium: { level: 0.5, state: 'unplugged' },
  low: { level: 0.1, state: 'unplugged' },
  critical: { level: 0.05, state: 'unplugged' },
};

// Accessibility testing helpers
export const a11yTestProps = (label: string, hint?: string) => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityHint: hint,
});

// Component testing utilities
export const renderWithProviders = (component: React.ReactElement) => {
  // This would typically wrap the component with necessary providers
  // For now, just return the component
  return component;
};

// Error boundary testing
export const throwError = (message: string) => {
  throw new Error(message);
};

// Deep linking test helpers
export const mockDeepLinkUrls = {
  login: 'messenger://login',
  chat: 'messenger://chat/conv-1',
  profile: 'messenger://profile/user-1',
};

// Push notification test helpers
export const mockNotification = {
  id: 'notification-1',
  title: 'New Message',
  body: 'You have a new message',
  data: {
    type: 'message',
    conversationId: 'conv-1',
    messageId: 'msg-1',
  },
};

// File upload test helpers
export const mockFileUpload = {
  success: {
    id: 'file-1',
    filename: 'test.jpg',
    originalName: 'test.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    url: 'https://example.com/file.jpg',
    uploadedBy: mockUser.id,
    uploadedAt: '2024-01-01T00:00:00Z',
  },
  error: {
    message: 'File upload failed',
  },
};

// WebSocket test helpers
export const mockWebSocketEvents = {
  message: 'message',
  typing: 'typing',
  userOnline: 'userOnline',
  conversationUpdate: 'conversationUpdate',
};

// Biometric authentication test helpers
export const mockBiometricResults = {
  success: { success: true, biometricType: 'fingerprint' as const },
  failed: { success: false, error: 'Authentication failed' },
  notAvailable: { success: false, error: 'Biometric authentication not available' },
};

// Location testing helpers (if needed for future features)
export const mockLocation = {
  coords: {
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 5,
  },
  timestamp: Date.now(),
};

// Camera testing helpers
export const mockCameraResult = {
  uri: 'file://test-image.jpg',
  type: 'image' as const,
  fileName: 'test.jpg',
  fileSize: 1024,
};

// Contacts testing helpers
export const mockDeviceContact = {
  id: 'contact-1',
  name: 'John Doe',
  phoneNumbers: [{ number: '+1234567890', label: 'mobile' }],
  emails: [{ email: 'john@example.com', label: 'work' }],
  imageAvailable: false,
};

// Performance benchmarks
export const performanceBenchmarks = {
  appStartTime: 2000, // 2 seconds max
  screenTransitionTime: 300, // 300ms max
  apiResponseTime: 1000, // 1 second max
  imageLoadTime: 500, // 500ms max
  memoryUsageLimit: 100 * 1024 * 1024, // 100MB max
};

// Test data generators
export const generateMockMessages = (count: number, conversationId: string) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `msg-${index + 1}`,
    conversationId,
    senderId: index % 2 === 0 ? mockUser.id : 'user-2',
    content: `Message ${index + 1}`,
    type: 'text' as const,
    createdAt: new Date(Date.now() - (count - index) * 60000).toISOString(),
    isRead: index < count - 2,
    readBy: [],
  }));
};

export const generateMockConversations = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `conv-${index + 1}`,
    type: 'direct' as const,
    participants: [mockUser],
    unreadCount: Math.floor(Math.random() * 5),
    createdAt: new Date(Date.now() - index * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - index * 3600000).toISOString(),
    createdBy: mockUser.id,
    lastMessage: {
      id: `msg-${index + 1}`,
      conversationId: `conv-${index + 1}`,
      senderId: mockUser.id,
      content: `Last message ${index + 1}`,
      type: 'text' as const,
      createdAt: new Date(Date.now() - index * 3600000).toISOString(),
      isRead: false,
      readBy: [],
    },
  }));
};