/**
 * Mock Data Factories
 * Create realistic test data for components, hooks, and integration tests
 */

export const mockDataFactories = {
  // User factories
  createMockUser: (overrides: Record<string, unknown> = {}) => ({
    id: 'user-' + Math.random().toString(36).substr(2, 9),
    username: 'testuser',
    email: 'test@example.com',
    avatar: '/avatars/default.png',
    profilePicture: '/avatars/default.png',
    bio: 'Test user bio',
    phone: '+1234567890',
    status: 'online' as const,
    onlineStatus: 'online' as const,
    role: 'user',
    firstName: 'Test',
    lastName: 'User',
    approvalStatus: 'approved',
    twoFactorEnabled: false,
    createdAt: new Date(),
    ...overrides,
  }),

  // Message factories
  createMockMessage: (overrides: Record<string, unknown> = {}) => ({
    id: 'msg-' + Math.random().toString(36).substr(2, 9),
    content: 'Test message',
    text: 'Test message',
    senderId: 'user-123',
    recipientId: 'user-456',
    messageType: 'text' as const,
    status: 'sent' as const,
    isRead: false,
    isDelivered: true,
    isEdited: false,
    isOwn: false,
    timestamp: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    reactions: {},
    ...overrides,
  }),

  // Contact factories
  createMockContact: (overrides: Record<string, unknown> = {}) => ({
    id: 'contact-' + Math.random().toString(36).substr(2, 9),
    userId: 'user-123',
    contactUserId: 'user-456',
    status: 'accepted' as const,
    isFavorite: false,
    isMuted: false,
    user: mockDataFactories.createMockUser(),
    createdAt: new Date(),
    ...overrides,
  }),

  // Group factories
  createMockGroup: (overrides: Record<string, unknown> = {}) => ({
    id: 'group-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Group',
    description: 'A test group',
    groupType: 'private' as const,
    avatar: '/groups/default.png',
    creatorId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
    ...overrides,
  }),

  // Conversation factories
  createMockConversation: (overrides: Record<string, unknown> = {}) => ({
    id: 'conv-' + Math.random().toString(36).substr(2, 9),
    type: 'direct' as const,
    userId: 'user-456',
    lastMessage: 'Last message text',
    lastMessageAt: new Date(),
    unreadCount: 0,
    isMuted: false,
    isPinned: false,
    user: mockDataFactories.createMockUser({ id: 'user-456' }),
    ...overrides,
  }),

  // Notification factories
  createMockNotification: (overrides: Record<string, unknown> = {}) => ({
    id: 'notif-' + Math.random().toString(36).substr(2, 9),
    type: 'message' as const,
    title: 'New message',
    message: 'You have a new message',
    isRead: false,
    createdAt: new Date(),
    data: {},
    ...overrides,
  }),

  // File factories
  createMockFile: (overrides: Record<string, unknown> = {}) => ({
    id: 'file-' + Math.random().toString(36).substr(2, 9),
    fileName: 'test-file.pdf',
    filePath: '/uploads/test-file.pdf',
    fileSize: 1024 * 100, // 100KB
    mimeType: 'application/pdf',
    uploadedBy: 'user-123',
    createdAt: new Date(),
    ...overrides,
  }),

  // Call factories
  createMockCall: (overrides: Record<string, unknown> = {}) => ({
    id: 'call-' + Math.random().toString(36).substr(2, 9),
    callerId: 'user-123',
    recipientId: 'user-456',
    callType: 'video' as const,
    status: 'completed' as const,
    duration: 300, // 5 minutes
    startedAt: new Date(Date.now() - 300000),
    endedAt: new Date(),
    ...overrides,
  }),

  // Reaction factories
  createMockReaction: (overrides: Record<string, unknown> = {}) => ({
    id: 'reaction-' + Math.random().toString(36).substr(2, 9),
    messageId: 'msg-123',
    userId: 'user-123',
    emoji: '👍',
    createdAt: new Date(),
    ...overrides,
  }),

  // Settings factories
  createMockSettings: (overrides: Record<string, unknown> = {}) => ({
    showOnlineStatus: true,
    sendReadReceipts: true,
    allowNotifications: true,
    soundEnabled: true,
    theme: 'light' as const,
    language: 'en',
    ...overrides,
  }),

  // Admin stats factories
  createMockAdminStats: (overrides: Record<string, unknown> = {}) => ({
    totalUsers: 100,
    activeUsers: 75,
    pendingUsers: 10,
    totalMessages: 10000,
    totalFiles: 500,
    storageUsed: 1024 * 1024 * 500, // 500MB
    ...overrides,
  }),

  // Audit log factories
  createMockAuditLog: (overrides: Record<string, unknown> = {}) => ({
    id: 'audit-' + Math.random().toString(36).substr(2, 9),
    userId: 'user-123',
    action: 'login',
    resourceType: 'user',
    resourceId: 'user-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    status: 'success' as const,
    createdAt: new Date(),
    details: {},
    ...overrides,
  }),

  // Create multiple items
  createMockUsers: (count: number, overrides: Record<string, unknown> = {}) => {
    return Array.from({ length: count }, (_, i) =>
      mockDataFactories.createMockUser({
        id: `user-${i}`,
        username: `user${i}`,
        email: `user${i}@example.com`,
        ...overrides,
      })
    );
  },

  createMockMessages: (count: number, overrides: Record<string, unknown> = {}) => {
    return Array.from({ length: count }, (_, i) =>
      mockDataFactories.createMockMessage({
        id: `msg-${i}`,
        content: `Message ${i}`,
        ...overrides,
      })
    );
  },

  createMockContacts: (count: number, overrides: Record<string, unknown> = {}) => {
    return Array.from({ length: count }, (_, i) =>
      mockDataFactories.createMockContact({
        id: `contact-${i}`,
        user: mockDataFactories.createMockUser({
          id: `user-${i}`,
          username: `contact${i}`,
        }),
        ...overrides,
      })
    );
  },

  createMockConversations: (count: number, overrides: Record<string, unknown> = {}) => {
    return Array.from({ length: count }, (_, i) =>
      mockDataFactories.createMockConversation({
        id: `conv-${i}`,
        user: mockDataFactories.createMockUser({
          id: `user-${i}`,
          username: `user${i}`,
        }),
        ...overrides,
      })
    );
  },

  // WebSocket event factories
  createMockSocketEvent: (type: string, data: Record<string, unknown> = {}) => ({
    type,
    timestamp: new Date(),
    data,
  }),
};

// Helper functions for testing
export const testHelpers = {
  // Wait for a condition to be true
  waitForCondition: async (
    condition: () => boolean,
    timeout = 5000,
    interval = 100
  ): Promise<void> => {
    const startTime = Date.now();
    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  },

  // Create a mock file
  createMockFileObject: (
    name: string = 'test.txt',
    content: string = 'test content',
    type: string = 'text/plain'
  ): File => {
    const blob = new Blob([content], { type });
    return new File([blob], name, { type });
  },

  // Create a mock image file
  createMockImageFile: (
    name: string = 'test.jpg',
    width: number = 100,
    height: number = 100
  ): File => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, width, height);
    }

    // Convert canvas to blob
    const dataUrl = canvas.toDataURL('image/jpeg');
    const blob = dataURLtoBlob(dataUrl);
    return new File([blob], name, { type: 'image/jpeg' });
  },

  // Delay for testing
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Format date for testing
  formatDate: (date: Date) => {
    return date.toISOString();
  },
};

// Helper to convert data URL to Blob
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Export everything
export default mockDataFactories;
