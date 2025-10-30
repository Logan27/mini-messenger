import { http, HttpResponse } from 'msw';

// Mock data
const mockUsers = [
  {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://example.com/avatar1.jpg',
    role: 'user',
    isApproved: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Admin User',
    avatar: 'https://example.com/avatar2.jpg',
    role: 'admin',
    isApproved: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const mockMessages = [
  {
    id: '1',
    content: 'Hello, how are you?',
    senderId: '1',
    recipientId: '2',
    type: 'text',
    createdAt: '2024-01-01T10:00:00Z',
    isRead: false,
  },
  {
    id: '2',
    content: 'I am doing great, thanks!',
    senderId: '2',
    recipientId: '1',
    type: 'text',
    createdAt: '2024-01-01T10:05:00Z',
    isRead: true,
  },
];

const mockGroups = [
  {
    id: '1',
    name: 'Test Group',
    description: 'A test group for messaging',
    avatar: 'https://example.com/group1.jpg',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00Z',
    members: ['1', '2'],
  },
];

// API Handlers
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();

    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        user: mockUsers[0],
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
      });
    }

    return new HttpResponse(
      JSON.stringify({ message: 'Invalid credentials' }),
      { status: 401 }
    );
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const userData = await request.json();

    const newUser = {
      id: String(mockUsers.length + 1),
      ...userData,
      role: 'user',
      isApproved: false,
      createdAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);

    return HttpResponse.json({
      message: 'Registration successful. Please wait for admin approval.',
      user: newUser,
    });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // User endpoints
  http.get('/api/users/me', ({ cookies }) => {
    const token = cookies.token;

    if (!token || token !== 'mock-jwt-token') {
      return new HttpResponse(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401 }
      );
    }

    return HttpResponse.json(mockUsers[0]);
  }),

  http.get('/api/users/search', ({ url, cookies }) => {
    const token = cookies.token;

    if (!token || token !== 'mock-jwt-token') {
      return new HttpResponse(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const query = url.searchParams.get('q') || '';
    const filteredUsers = mockUsers.filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase())
    );

    return HttpResponse.json(filteredUsers);
  }),

  // Message endpoints
  http.get('/api/messages', ({ url, cookies }) => {
    const token = cookies.token;

    if (!token || token !== 'mock-jwt-token') {
      return new HttpResponse(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const recipientId = url.searchParams.get('recipientId');
    const groupId = url.searchParams.get('groupId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let filteredMessages = mockMessages;

    if (recipientId) {
      filteredMessages = mockMessages.filter(
        msg => msg.senderId === recipientId || msg.recipientId === recipientId
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

    return HttpResponse.json({
      messages: paginatedMessages,
      pagination: {
        page,
        limit,
        total: filteredMessages.length,
        pages: Math.ceil(filteredMessages.length / limit),
      },
    });
  }),

  http.post('/api/messages', async ({ request, cookies }) => {
    const token = cookies.token;

    if (!token || token !== 'mock-jwt-token') {
      return new HttpResponse(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const messageData = await request.json();

    const newMessage = {
      id: String(mockMessages.length + 1),
      ...messageData,
      senderId: '1', // Current user
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    mockMessages.push(newMessage);

    return HttpResponse.json(newMessage);
  }),

  // Group endpoints
  http.get('/api/groups', ({ cookies }) => {
    const token = cookies.token;

    if (!token || token !== 'mock-jwt-token') {
      return new HttpResponse(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401 }
      );
    }

    return HttpResponse.json(mockGroups);
  }),

  http.post('/api/groups', async ({ request, cookies }) => {
    const token = cookies.token;

    if (!token || token !== 'mock-jwt-token') {
      return new HttpResponse(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const groupData = await request.json();

    const newGroup = {
      id: String(mockGroups.length + 1),
      ...groupData,
      createdBy: '1', // Current user
      createdAt: new Date().toISOString(),
      members: [groupData.createdBy, ...groupData.members],
    };

    mockGroups.push(newGroup);

    return HttpResponse.json(newGroup);
  }),

  // File upload endpoint
  http.post('/api/files/upload', async ({ cookies }) => {
    const token = cookies.token;

    if (!token || token !== 'mock-jwt-token') {
      return new HttpResponse(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401 }
      );
    }

    return HttpResponse.json({
      id: 'file1',
      filename: 'test-image.jpg',
      url: 'https://example.com/files/test-image.jpg',
      size: 1024000,
      mimeType: 'image/jpeg',
      uploadedAt: new Date().toISOString(),
    });
  }),

  // WebSocket connection (for testing purposes)
  http.get('/socket.io/', () => {
    return HttpResponse.json({ sid: 'mock-socket-id' });
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }),
];