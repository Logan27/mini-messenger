import swaggerJsdoc from 'swagger-jsdoc';

import config from './index.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Messenger Application API',
    version: '1.0.0',
    description: `
# Messenger Application API

A secure, real-time messaging platform with end-to-end encryption, P2P video calling, and WebSocket support.

## Features
- 🔐 **End-to-End Encryption**: All messages encrypted client-side with libsodium
- 📹 **P2P Video Calls**: Direct peer-to-peer video/audio calls with WebRTC
- 💬 **Real-time Messaging**: WebSocket-based instant messaging
- 👥 **Group Chats**: Support for group messaging with up to 100 users
- 📁 **File Sharing**: Secure file uploads with virus scanning (ClamAV)
- 🔔 **Push Notifications**: Real-time notifications via Firebase
- ⏰ **Message Retention**: Auto-deletion after 30 days
- 🛡️ **Admin Approval**: Manual user approval system
- 🚦 **Rate Limiting**: Multi-tier rate limiting protection

## Authentication
All protected endpoints require JWT bearer token authentication.

### How to authenticate:
1. Register a new user via \`POST /api/auth/register\`
2. Wait for admin approval
3. Login via \`POST /api/auth/login\`
4. Use the returned JWT token in the Authorization header: \`Bearer <token>\`

## Rate Limits
- **Login**: 5 requests per 15 minutes
- **API**: 100 requests per 15 minutes
- **File Upload**: 10 requests per hour

## WebSocket Events
Connect to \`ws://localhost:4000\` for real-time features:
- \`message:new\` - New message received
- \`message:read\` - Message read status updated
- \`user:online\` - User came online
- \`call:incoming\` - Incoming call notification
    `,
    contact: {
      name: 'API Support',
      email: 'support@messenger.local',
    },
    license: {
      name: 'Proprietary',
      url: 'https://messenger.local/license',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Development server (local)',
    },
    {
      url: `http://localhost:${config.port}/api`,
      description: 'Development API (local)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from /api/auth/login',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'User unique identifier',
          },
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            description: 'Username (3-50 characters)',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          firstName: {
            type: 'string',
            nullable: true,
            description: 'User first name',
          },
          lastName: {
            type: 'string',
            nullable: true,
            description: 'User last name',
          },
          avatar: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'User avatar URL',
          },
          bio: {
            type: 'string',
            maxLength: 500,
            nullable: true,
            description: 'User biography (max 500 characters)',
          },
          status: {
            type: 'string',
            enum: ['pending', 'active', 'inactive', 'suspended'],
            description: 'User account status',
          },
          onlineStatus: {
            type: 'string',
            enum: ['online', 'offline', 'away', 'busy'],
            description: 'User online status',
          },
          role: {
            type: 'string',
            enum: ['user', 'admin'],
            description: 'User role',
          },
          twoFactorEnabled: {
            type: 'boolean',
            description: '2FA enabled status',
          },
          lastSeenAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Last seen timestamp',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Message unique identifier',
          },
          senderId: {
            type: 'string',
            format: 'uuid',
            description: 'Sender user ID',
          },
          recipientId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Recipient user ID (for direct messages)',
          },
          groupId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Group ID (for group messages)',
          },
          content: {
            type: 'string',
            maxLength: 10000,
            description: 'Message content (max 10,000 characters)',
          },
          encryptedContent: {
            type: 'string',
            nullable: true,
            description: 'End-to-end encrypted message content',
          },
          messageType: {
            type: 'string',
            enum: ['text', 'file', 'image', 'system'],
            description: 'Message type',
          },
          status: {
            type: 'string',
            enum: ['sent', 'delivered', 'read'],
            description: 'Message delivery status',
          },
          isRead: {
            type: 'boolean',
            description: 'Message read status',
          },
          isDelivered: {
            type: 'boolean',
            description: 'Message delivered status',
          },
          isEdited: {
            type: 'boolean',
            description: 'Message edited flag',
          },
          fileId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Attached file ID',
          },
          replyToId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Reply to message ID',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Message creation timestamp',
          },
          editedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Message edit timestamp',
          },
          deletedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Message deletion timestamp',
          },
        },
      },
      Group: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Group unique identifier',
          },
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 100,
            description: 'Group name (3-100 characters)',
          },
          description: {
            type: 'string',
            maxLength: 500,
            nullable: true,
            description: 'Group description (max 500 characters)',
          },
          avatar: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'Group avatar URL',
          },
          createdBy: {
            type: 'string',
            format: 'uuid',
            description: 'Creator user ID',
          },
          memberCount: {
            type: 'integer',
            description: 'Number of members in the group',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Group creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
        },
      },
      File: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'File unique identifier',
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'Uploader user ID',
          },
          fileName: {
            type: 'string',
            description: 'Original file name',
          },
          fileSize: {
            type: 'integer',
            description: 'File size in bytes',
          },
          mimeType: {
            type: 'string',
            description: 'File MIME type',
          },
          fileUrl: {
            type: 'string',
            format: 'uri',
            description: 'File download URL',
          },
          thumbnailUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'Thumbnail URL (for images/videos)',
          },
          virusScanStatus: {
            type: 'string',
            enum: ['pending', 'clean', 'infected', 'skipped'],
            description: 'ClamAV virus scan status',
          },
          uploadedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Upload timestamp',
          },
        },
      },
      Call: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Call unique identifier',
          },
          callerId: {
            type: 'string',
            format: 'uuid',
            description: 'Caller user ID',
          },
          recipientId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Recipient user ID (for 1-to-1 calls)',
          },
          groupId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Group ID (for group calls)',
          },
          callType: {
            type: 'string',
            enum: ['video', 'audio'],
            description: 'Type of call',
          },
          status: {
            type: 'string',
            enum: ['initiated', 'ringing', 'connected', 'ended', 'missed', 'cancelled'],
            description: 'Call status',
          },
          startedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Call start timestamp',
          },
          endedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Call end timestamp',
          },
          durationSeconds: {
            type: 'integer',
            description: 'Call duration in seconds',
          },
        },
      },
      Contact: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Contact relationship ID',
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'User ID',
          },
          contactId: {
            type: 'string',
            format: 'uuid',
            description: 'Contact user ID',
          },
          status: {
            type: 'string',
            enum: ['pending', 'accepted', 'blocked'],
            description: 'Contact relationship status',
          },
          addedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Contact added timestamp',
          },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Notification unique identifier',
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'Recipient user ID',
          },
          type: {
            type: 'string',
            enum: ['message', 'call', 'contact_request', 'group_invite', 'system'],
            description: 'Notification type',
          },
          title: {
            type: 'string',
            description: 'Notification title',
          },
          body: {
            type: 'string',
            description: 'Notification body text',
          },
          isRead: {
            type: 'boolean',
            description: 'Read status',
          },
          data: {
            type: 'object',
            nullable: true,
            description: 'Additional notification data',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Notification creation timestamp',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code',
              },
              message: {
                type: 'string',
                description: 'Human-readable error message',
              },
              details: {
                type: 'object',
                nullable: true,
                description: 'Additional error details',
              },
            },
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            description: 'Response data',
          },
          message: {
            type: 'string',
            nullable: true,
            description: 'Optional success message',
          },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
            },
            description: 'Paginated data items',
          },
          pagination: {
            type: 'object',
            properties: {
              total: {
                type: 'integer',
                description: 'Total number of items',
              },
              page: {
                type: 'integer',
                description: 'Current page number',
              },
              limit: {
                type: 'integer',
                description: 'Items per page',
              },
              totalPages: {
                type: 'integer',
                description: 'Total number of pages',
              },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required or invalid token',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
              },
            },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Insufficient permissions',
              },
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Resource not found',
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input data',
                details: {
                  field: 'email',
                  issue: 'Invalid email format',
                },
              },
            },
          },
        },
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests. Please try again later.',
                details: {
                  retryAfter: 900,
                  limit: 100,
                  window: '15 minutes',
                },
              },
            },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred',
              },
            },
          },
        },
      },
      SuccessResponse: {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Success',
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Authentication',
      description: `
## User authentication and authorization

Endpoints for user registration, login, logout, password reset, and token management.

**Key Features:**
- JWT-based authentication with refresh tokens
- Admin approval required for new users
- Email verification (auto-enabled in development)
- Password reset via email
- Session management with device tracking
      `,
    },
    {
      name: 'Users',
      description: `
## User management

Endpoints for managing user profiles, settings, and online status.

**Capabilities:**
- Get and update user profiles
- Search users
- Manage online status
- Block/unblock users
- Get user statistics
      `,
    },
    {
      name: 'Messages',
      description: `
## Messaging system

Endpoints for sending and managing messages in 1-to-1 and group chats.

**Features:**
- End-to-end encrypted messaging
- Message read receipts
- Message editing and deletion
- Reply to messages
- File attachments
- Message search
- Auto-deletion after 30 days
      `,
    },
    {
      name: 'Groups',
      description: `
## Group chat management

Create and manage group chats with multiple participants.

**Capabilities:**
- Create/update/delete groups
- Add/remove members
- Manage member roles
- Group avatars and descriptions
- Maximum 100 users per account limit
      `,
    },
    {
      name: 'Contacts',
      description: `
## Contact management

Manage user contacts and friend requests.

**Features:**
- Send/accept/reject contact requests
- View contact list
- Block/unblock contacts
- Search contacts
      `,
    },
    {
      name: 'Files',
      description: `
## File upload and management

Secure file sharing with virus scanning.

**Features:**
- File upload (max 10MB per file)
- ClamAV virus scanning
- Thumbnail generation for images
- Supported formats: images, documents, archives
- Rate limited: 10 uploads per hour
      `,
    },
    {
      name: 'Calls',
      description: `
## Video and voice calls

P2P WebRTC-based calling system.

**Features:**
- 1-to-1 and group video/audio calls
- WebRTC signaling
- Call history
- STUN/TURN server support
- Direct peer-to-peer media streams
      `,
    },
    {
      name: 'Notifications',
      description: `
## Push notifications

Real-time and push notification management.

**Capabilities:**
- Get notifications
- Mark as read/unread
- Notification preferences
- Firebase Cloud Messaging integration
- WebSocket real-time delivery
      `,
    },
    {
      name: 'Admin',
      description: `
## Administrative functions

Admin-only endpoints for system management.

**Requires admin role:**
- User approval/rejection
- User suspension/deletion
- System statistics
- Audit logs
- Bulk operations
- Platform announcements
      `,
    },
    {
      name: 'Health',
      description: `
## Health check and monitoring

System health and monitoring endpoints.

**Endpoints:**
- Health check
- Readiness probe
- Database connection status
- Redis connection status
- Prometheus metrics
      `,
    },
  ],
};

const options = {
  swaggerDefinition,
  // Path to the API routes files with JSDoc comments
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/models/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
