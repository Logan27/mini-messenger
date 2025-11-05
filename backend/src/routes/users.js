import fs from 'fs/promises';
import path from 'path';

import express from 'express';
import Joi from 'joi';
import multer from 'multer';
import { Op } from 'sequelize';

import { sequelize } from '../config/database.js';
import userController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../middleware/requestLogger.js';
import { User, Contact } from '../models/index.js';
import auditService from '../services/auditService.js';
import fileUploadService from '../services/fileUploadService.js';
import searchCacheService from '../services/searchCacheService.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './temp/'); // Use temp directory for initial storage
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  },
});

// Validation schemas
const userProfileSchema = Joi.object({
  firstName: Joi.string().trim().max(100).allow('').messages({
    'string.max': 'First name cannot exceed 100 characters',
  }),
  lastName: Joi.string().trim().max(100).allow('').messages({
    'string.max': 'Last name cannot exceed 100 characters',
  }),
  bio: Joi.string().trim().max(500).allow('').messages({
    'string.max': 'Bio cannot exceed 500 characters',
  }),
  phone: Joi.string().trim().pattern(/^\+?[1-9]\d{1,14}$/).allow('', null).messages({
    'string.pattern.base': 'Phone must be a valid E.164 format (e.g., +1234567890)',
  }),
  avatar: Joi.string().max(500).allow('').messages({
    'string.max': 'Avatar URL cannot exceed 500 characters',
  }),
  status: Joi.string().valid('online', 'offline', 'away', 'busy').messages({
    'any.only': 'Status must be one of: online, offline, away, busy',
  }),
  username: Joi.string().trim().min(3).max(50).pattern(/^[a-zA-Z0-9_]+$/).messages({
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username cannot exceed 50 characters',
    'string.pattern.base': 'Username must contain only letters, numbers, and underscores',
  }),
  email: Joi.string().email({ tlds: { allow: false } }).max(255).messages({
    'string.email': 'Email must be valid',
    'string.max': 'Email cannot exceed 255 characters',
  }),
  settings: Joi.object({
    showOnlineStatus: Joi.boolean(),
    sendReadReceipts: Joi.boolean(),
  }).unknown(true),
  profilePicture: Joi.string().max(500).allow('').messages({
    'string.max': 'Profile picture cannot exceed 500 characters',
  }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

const userQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be greater than 0',
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  status: Joi.string().valid('online', 'offline', 'away', 'busy'),
  search: Joi.string().trim().min(1).max(100).messages({
    'string.min': 'Search term must be at least 1 character',
    'string.max': 'Search term cannot exceed 100 characters',
  }),
});

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's complete profile information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const requestId = req.id;

    // TODO: Get user ID from authentication middleware
    const userId = req.user?.id;

    if (!userId) {
      logger.warn('Unauthorized access attempt to /me endpoint', {
        requestId,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const user = await User.findByPk(userId, {
      attributes: {
        exclude: [
          'passwordHash',
          'emailVerificationToken',
          'passwordResetToken',
          'passwordResetExpires',
        ],
      },
    });

    if (!user) {
      logger.warn('User not found in /me endpoint', {
        requestId,
        userId,
        ip: req.ip,
      });
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    logger.info('User profile retrieved successfully', {
      requestId,
      userId,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error retrieving user profile', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user profile
 *     description: Update the authenticated user's profile information (firstName, lastName, bio, phone, etc.)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Doe"
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Software developer and tech enthusiast"
 *               phone:
 *                 type: string
 *                 pattern: '^\+?[1-9]\d{1,14}$'
 *                 example: "+1234567890"
 *               status:
 *                 type: string
 *                 enum: [online, offline, away, busy]
 *                 example: "online"
 *               settings:
 *                 type: object
 *                 properties:
 *                   showOnlineStatus:
 *                     type: boolean
 *                   sendReadReceipts:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/me', authenticate, async (req, res) => {
  try {
    const requestId = req.id;

    // TODO: Get user ID from authentication middleware
    const userId = req.user?.id;

    if (!userId) {
      logger.warn('Unauthorized access attempt to update profile', {
        requestId,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Validate request body
    const { error: validationError, value: validatedData } = userProfileSchema.validate(req.body);

    if (validationError) {
      logger.warn('Profile update validation failed', {
        requestId,
        userId,
        error: validationError.details[0].message,
        ip: req.ip,
      });
      return res.status(400).json({
        success: false,
        error: validationError.details[0].message,
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      logger.warn('User not found for profile update', {
        requestId,
        userId,
        ip: req.ip,
      });
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check for sensitive changes that require password verification
    const sensitiveFields = ['email', 'username'];
    const hasSensitiveChanges = sensitiveFields.some(field => validatedData[field]);

    if (hasSensitiveChanges) {
      const { currentPassword } = req.body;

      if (!currentPassword) {
        logger.warn('Sensitive profile update attempted without current password', {
          requestId,
          userId,
          sensitiveFields: sensitiveFields.filter(field => validatedData[field]),
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: 'Current password is required for sensitive changes',
        });
      }

      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        logger.warn('Invalid current password for sensitive profile update', {
          requestId,
          userId,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // Check username uniqueness if username is being changed
      if (validatedData.username && validatedData.username !== user.username) {
        const existingUser = await User.findOne({
          where: {
            username: validatedData.username,
            id: { [Op.ne]: userId },
          },
        });

        if (existingUser) {
          logger.warn('Username already exists during profile update', {
            requestId,
            userId,
            attemptedUsername: validatedData.username,
            ip: req.ip,
          });
          return res.status(409).json({
            success: false,
            error: 'Username already exists',
          });
        }
      }
    }

    // Update user profile
    const updatedUser = await user.update(validatedData);

    // Log profile change
    await auditService.logProfileChange({
      requestId,
      userId,
      changes: validatedData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'low',
      status: 'success',
    });

    logger.info('User profile updated successfully', {
      requestId,
      userId,
      updatedFields: Object.keys(validatedData),
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        bio: updatedUser.bio,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        status: updatedUser.status,
        emailVerified: updatedUser.emailVerified,
        lastLoginAt: updatedUser.lastLoginAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error updating user profile', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users
 *     description: Search users by username, email, firstName, or lastName with pagination
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (minimum 2 characters)
 *         example: "john"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Results per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [online, offline, away, busy]
 *         description: Filter by online status
 *     responses:
 *       200:
 *         description: Search results with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/search', authenticate, async (req, res) => {
  try {
    const requestId = req.id;

    // TODO: Get user ID from authentication middleware
    const userId = req.user?.id;

    if (!userId) {
      logger.warn('Unauthorized access attempt to user search', {
        requestId,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Accept both 'query' and 'q' parameters for flexibility
    const { query, q, page = 1, limit = 20 } = req.query;
    const searchQuery = query || q;

    if (!searchQuery || searchQuery.trim().length === 0) {
      logger.warn('User search attempted without query', {
        requestId,
        userId,
        ip: req.ip,
      });
      return res.status(400).json({
        success: false,
        error: 'Search query is required (use ?query=... or ?q=...)',
      });
    }

    const searchTerm = searchQuery.trim();
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters',
      });
    }

    // Check cache first for search results
    const cachedResults = await searchCacheService.getCachedResults(
      searchTerm,
      userId,
      page,
      limit
    );
    if (cachedResults) {
      logger.info('User search results served from cache', {
        requestId,
        userId,
        searchTerm,
        page,
        limit,
        ip: req.ip,
      });

      return res.json({
        success: true,
        data: cachedResults,
        cached: true,
      });
    }

    // Check cache for blocked users list
    let blockedUserIds = await searchCacheService.getCachedBlockedUsers(userId);

    if (!blockedUserIds) {
      // Find blocked users to exclude from search results using optimized query
      const blockedUsers = await Contact.findAll({
        where: {
          [Op.or]: [
            { userId, status: 'blocked' },
            { contactUserId: userId, status: 'blocked' },
          ],
        },
        attributes: ['userId', 'contactUserId'],
        // Use the optimized index for blocked contacts
        // useIndex: ['idx_contacts_user_blocked'], // Commented out - not all DB drivers support this
      });

      // Extract blocked user IDs more efficiently
      blockedUserIds = new Set();
      for (const contact of blockedUsers) {
        if (contact.userId === userId) {
          blockedUserIds.add(contact.contactUserId);
        } else if (contact.contactUserId === userId) {
          blockedUserIds.add(contact.userId);
        }
      }

      // Cache the blocked users list
      await searchCacheService.setCachedBlockedUsers(userId, blockedUserIds);
    }

    // Search users using optimized full-text search with GIN indexes
    // Use trigram similarity for fuzzy matching and text search for relevance
    const { rows: users, count: totalUsers } = await User.findAndCountAll({
      where: {
        [Op.and]: [
          // Combined search strategy for better partial matching:
          // 1. Full-text search (for word-based matching)
          // 2. Trigram similarity (for fuzzy matching)
          // 3. ILIKE prefix matching (for better partial/prefix matches)
          sequelize.literal(`
            (
              to_tsvector('english',
                COALESCE("username", '') || ' ' ||
                COALESCE("firstName", '') || ' ' ||
                COALESCE("lastName", '') || ' ' ||
                COALESCE("email", '')
              ) @@
              plainto_tsquery('english', '${searchTerm.replace(/'/g, "''")}')
              OR
              ("username" || ' ' || COALESCE("firstName", '') || ' ' || COALESCE("lastName", '') || ' ' || "email") % '${searchTerm.replace(/'/g, "''")}'
              OR
              "username" ILIKE '${searchTerm.replace(/'/g, "''")}%'
              OR
              COALESCE("firstName", '') ILIKE '${searchTerm.replace(/'/g, "''")}%'
              OR
              COALESCE("lastName", '') ILIKE '${searchTerm.replace(/'/g, "''")}%'
              OR
              "email" ILIKE '${searchTerm.replace(/'/g, "''")}%'
            )
          `),
          // Exclude current user from results
          { id: { [Op.ne]: userId } },
          // Exclude blocked users (handle both Set and Array)
          ...(blockedUserIds && (blockedUserIds.size > 0 || blockedUserIds.length > 0)
            ? [{ id: { [Op.notIn]: Array.from(blockedUserIds) } }]
            : []),
          // Only show approved users
          { approvalStatus: 'approved' },
        ],
      },
      attributes: {
        exclude: [
          'passwordHash',
          'emailVerificationToken',
          'passwordResetToken',
          'passwordResetExpires',
          'failedLoginAttempts',
          'lockedUntil',
          'rejectionReason',
        ],
      },
      limit: parseInt(limit),
      offset,
      order: [
        // Order by relevance using trigram similarity for better fuzzy matching
        [
          sequelize.literal(`
          (
            GREATEST(
              SIMILARITY(COALESCE("username", ''), '${searchTerm.replace(/'/g, "''")}'),
              SIMILARITY(COALESCE("firstName", ''), '${searchTerm.replace(/'/g, "''")}'),
              SIMILARITY(COALESCE("lastName", ''), '${searchTerm.replace(/'/g, "''")}'),
              SIMILARITY(COALESCE("email", ''), '${searchTerm.replace(/'/g, "''")}')
            ) * 0.4 +
            ts_rank(
              to_tsvector('english',
                COALESCE("username", '') || ' ' ||
                COALESCE("firstName", '') || ' ' ||
                COALESCE("lastName", '') || ' ' ||
                COALESCE("email", '')
              ),
              plainto_tsquery('english', '${searchTerm.replace(/'/g, "''")}')
            ) * 0.6
          )
        `),
          'DESC',
        ],
        ['createdAt', 'DESC'],
      ],
    });

    const totalPages = Math.ceil(totalUsers / limit);

    // Prepare response data
    const responseData = {
      users,
      search: {
        query: searchTerm,
        totalResults: totalUsers,
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit),
      },
    };

    // Cache the search results for future requests
    await searchCacheService.setCachedResults(searchTerm, userId, page, limit, responseData);

    logger.info('User search completed successfully', {
      requestId,
      userId,
      searchTerm,
      totalUsers,
      page,
      limit,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: responseData,
      cached: false,
    });
  } catch (error) {
    logger.error('Error searching users', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: {
        type: 'SEARCH_ERROR',
        message: 'An error occurred while searching users',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
});

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user's public profile information by their user ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User unique identifier
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:userId', async (req, res) => {
  try {
    const requestId = req.id;
    const { userId } = req.params;

    // Validate UUID format
    const { validateUUID } = await import('../utils/validation.js');
    if (!validateUUID(userId)) {
      logger.warn('Invalid UUID format in user lookup', {
        requestId,
        userId,
        ip: req.ip,
      });
      return res.status(400).json({
        success: false,
        error: {
          type: 'INVALID_UUID',
          message: 'Invalid user ID format',
        },
      });
    }

    const user = await User.findByPk(userId, {
      attributes: {
        exclude: [
          'passwordHash',
          'emailVerificationToken',
          'passwordResetToken',
          'passwordResetExpires',
        ],
      },
    });

    if (!user) {
      logger.warn('User not found', {
        requestId,
        userId,
        ip: req.ip,
      });
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    logger.info('User retrieved successfully', {
      requestId,
      userId,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error retrieving user', {
      requestId: req.id,
      userId: req.params.userId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users
 *     description: Get a paginated list of all users with optional status filtering
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Results per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [online, offline, away, busy]
 *         description: Filter by online status
 *     responses:
 *       200:
 *         description: List of users with pagination
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', async (req, res) => {
  try {
    const requestId = req.id;

    // Validate query parameters
    const { error: validationError, value: queryParams } = userQuerySchema.validate(req.query);

    if (validationError) {
      logger.warn('User list query validation failed', {
        requestId,
        error: validationError.details[0].message,
        ip: req.ip,
      });
      return res.status(400).json({
        success: false,
        error: validationError.details[0].message,
      });
    }

    const { page, limit, status, search } = queryParams;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Get users with pagination
    const { rows: users, count: totalUsers } = await User.findAndCountAll({
      where: whereClause,
      attributes: {
        exclude: [
          'passwordHash',
          'emailVerificationToken',
          'passwordResetToken',
          'passwordResetExpires',
        ],
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const totalPages = Math.ceil(totalUsers / limit);

    logger.info('Users list retrieved successfully', {
      requestId,
      totalUsers,
      page,
      limit,
      status,
      search,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error('Error retrieving users list', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/users/me/avatar:
 *   post:
 *     summary: Upload profile avatar
 *     description: Upload a new profile picture/avatar (max 5MB, images only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, GIF, WebP)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     avatarUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://example.com/avatars/avatar-123.jpg"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       413:
 *         description: File too large (max 5MB)
 *       415:
 *         description: Unsupported media type
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/me/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const requestId = req.id;
    const userId = req.user?.id;

    if (!userId) {
      logger.warn('Unauthorized avatar upload attempt', {
        requestId,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!req.file) {
      logger.warn('Avatar upload attempted without file', {
        requestId,
        userId,
        ip: req.ip,
      });
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    // Get current user to backup existing avatar
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn('User not found for avatar upload', {
        requestId,
        userId,
        ip: req.ip,
      });
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const oldAvatar = user.avatar;

    try {
      // Process the uploaded file
      const processedFile = await fileUploadService.processFile(req.file, {
        resizeImage: true,
        thumbnailSize: 200,
        generateThumbnail: true,
        userId: userId,
      });

      // Update user avatar with the processed file
      // Ensure path starts with / for proper URL formation
      let avatarPath = processedFile.filePath.replace(/\\/g, '/');
      
      // Extract path starting from 'uploads/'
      if (avatarPath.includes('uploads/')) {
        avatarPath = '/' + avatarPath.substring(avatarPath.indexOf('uploads/'));
      } else if (!avatarPath.startsWith('/')) {
        avatarPath = '/' + avatarPath;
      }
      
      logger.info('Avatar path generated', { filePath: processedFile.filePath, avatarPath });
      
      await user.update({
        avatar: avatarPath, // Serve from uploads directory
      }, { validate: false }); // Skip validation since we know path is valid

      // Log profile change
      await auditService.logProfileChange({
        requestId,
        userId,
        changes: { avatar: user.avatar },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low',
        status: 'success',
      });

      // Delete old avatar files if they exist
      if (oldAvatar && oldAvatar.startsWith('/')) {
        const oldFiles = [oldAvatar.replace('/', '')];
        // Also try to delete thumbnail and resized versions
        const oldName = oldAvatar.replace('/', '').replace(path.extname(oldAvatar), '');
        oldFiles.push(`${oldName}_thumb${path.extname(oldAvatar)}`);
        oldFiles.push(`${oldName}_resized${path.extname(oldAvatar)}`);

        await fileUploadService.deleteFiles(oldFiles);
      }

      logger.info('Avatar uploaded successfully', {
        requestId,
        userId,
        avatarUrl: user.avatar,
        fileSize: req.file.size,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatar: user.avatar,
          file: processedFile,
        },
      });
    } catch (fileError) {
      logger.error('File processing error during avatar upload', {
        requestId,
        userId,
        error: fileError.message,
        stack: fileError.stack,
      });

      // Clean up uploaded file if processing failed
      try {
        if (req.file?.path) {
          await fs.unlink(req.file.path).catch(() => {});
        }
      } catch (cleanupError) {
        logger.error('Failed to cleanup uploaded file', { error: cleanupError.message });
      }

      // Return error response instead of crashing
      return res.status(500).json({
        success: false,
        error: {
          type: 'FILE_PROCESSING_ERROR',
          message: 'Failed to process avatar upload',
          details: process.env.NODE_ENV === 'development' ? fileError.message : undefined,
        },
      });
    }
  } catch (error) {
    logger.error('Avatar upload error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     description: Soft delete a user account (requires admin role)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    const requestId = req.id;
    const { userId } = req.params;

    // TODO: Add admin authorization check
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      logger.warn('Unauthorized delete attempt', {
        requestId,
        userId,
        attemptedBy: req.user?.id,
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      logger.warn('User not found for deletion', {
        requestId,
        userId,
        ip: req.ip,
      });
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Soft delete the user
    await user.destroy();

    logger.info('User deleted successfully', {
      requestId,
      userId,
      deletedBy: req.user?.id,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting user', {
      requestId: req.id,
      userId: req.params.userId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/users/me/device-token:
 *   post:
 *     summary: Register device token for push notifications
 *     description: Register a Firebase Cloud Messaging (FCM) device token for push notifications
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceToken
 *             properties:
 *               deviceToken:
 *                 type: string
 *                 description: FCM device token
 *                 example: "fK3g2...token...xyz"
 *               token:
 *                 type: string
 *                 description: Alternative field name for device token
 *               platform:
 *                 type: string
 *                 enum: [ios, android, web]
 *                 description: Device platform
 *     responses:
 *       200:
 *         description: Device token registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Device token registered successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/me/device-token', authenticate, async (req, res) => {
  try {
    const requestId = req.id;
    const userId = req.user?.id;
    // Accept both 'deviceToken' and 'token' for flexibility
    const { deviceToken, token, platform } = req.body;
    const finalToken = deviceToken || token;

    if (!userId) {
      logger.warn('Unauthorized device token registration attempt', {
        requestId,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!finalToken) {
      return res.status(400).json({
        success: false,
        error: 'Device token is required',
      });
    }

    // Store device token (simplified implementation)
    // In a real implementation, you would store this in a database
    logger.info('Device token registered', {
      requestId,
      userId,
      deviceToken: finalToken,
      platform,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Device token registered successfully',
    });
  } catch (error) {
    logger.error('Error registering device token', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to register device token',
    });
  }
});

/**
 * @swagger
 * /api/users/me/device-token:
 *   delete:
 *     summary: Remove device token
 *     description: Unregister a device token to stop receiving push notifications
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceToken
 *             properties:
 *               deviceToken:
 *                 type: string
 *                 description: FCM device token to remove
 *     responses:
 *       200:
 *         description: Device token removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Device token removed successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/me/device-token', authenticate, async (req, res) => {
  try {
    const requestId = req.id;
    const userId = req.user?.id;
    const { deviceToken } = req.body;

    if (!userId) {
      logger.warn('Unauthorized device token removal attempt', {
        requestId,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Remove device token (simplified implementation)
    // In a real implementation, you would remove this from a database
    logger.info('Device token removed', {
      requestId,
      userId,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Device token removed successfully',
    });
  } catch (error) {
    logger.error('Error removing device token', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to remove device token',
    });
  }
});

/**
 * @swagger
 * /api/users/me/export:
 *   get:
 *     summary: Export user data
 *     description: Export all user data in JSON format (GDPR compliance)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Complete user data export
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/me/export', authenticate, async (req, res) => {
  try {
    const requestId = req.id;
    const userId = req.user?.id;

    if (!userId) {
      logger.warn('Unauthorized data export attempt', {
        requestId,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const user = await User.findByPk(userId, {
      attributes: {
        exclude: [
          'passwordHash',
          'emailVerificationToken',
          'passwordResetToken',
          'passwordResetExpires',
        ],
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Create export data (simplified implementation)
    const exportData = {
      user: user.toJSON(),
      exportDate: new Date().toISOString(),
    };

    logger.info('User data exported', {
      requestId,
      userId,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    logger.error('Error exporting user data', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to export user data',
    });
  }
});

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Delete own account
 *     description: Delete your own user account (soft delete)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account deleted successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/me', authenticate, async (req, res) => {
  try {
    const requestId = req.id;
    const userId = req.user?.id;

    if (!userId) {
      logger.warn('Unauthorized account deletion attempt', {
        requestId,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Soft delete user account
    await user.destroy();

    logger.info('User account deleted', {
      requestId,
      userId,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting user account', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
    });
  }
});

/**
 * @swagger
 * /api/users/me/privacy/read-receipts:
 *   put:
 *     summary: Update read receipts privacy setting
 *     description: Enable or disable sending read receipts to other users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Whether to send read receipts
 *                 example: true
 *     responses:
 *       200:
 *         description: Read receipts setting updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     readReceiptsEnabled: { type: boolean }
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.put('/me/privacy/read-receipts', authenticate, [
  body('enabled').isBoolean().withMessage('enabled must be a boolean'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { enabled } = req.body;
    const userId = req.user.id;

    // Update user's read receipts setting
    await User.update(
      { readReceiptsEnabled: enabled },
      { where: { id: userId } }
    );

    logger.info(`User ${userId} updated read receipts setting to: ${enabled}`);

    res.json({
      success: true,
      message: 'Read receipts setting updated successfully',
      data: {
        readReceiptsEnabled: enabled,
      },
    });
  } catch (error) {
    logger.error('Error updating read receipts setting', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update read receipts setting',
      error: error.message,
    });
  }
});

export default router;
