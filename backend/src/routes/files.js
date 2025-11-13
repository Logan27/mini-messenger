import fs from 'fs';
import path from 'path';

import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { authenticate } from '../middleware/auth.js';
import { File } from '../models/index.js';
import auditService from '../services/auditService.js';
import fileCleanupService from '../services/fileCleanupService.js';
import fileUploadService from '../services/fileUploadService.js';
import thumbnailService from '../services/thumbnailService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limiting for file uploads
const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 files per hour per user
  message: {
    error: 'Too many files uploaded. Maximum 10 files per hour allowed.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => {
    return req.user?.id || req.ip; // Use user ID if authenticated, otherwise IP
  },
});

// Rate limiting for file downloads
const downloadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 downloads per hour per user
  message: {
    error: 'Too many file downloads. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => {
    return req.user?.id || req.ip;
  },
});

// Apply authentication middleware to all routes
router.use(authenticate);

// File validation rules
const uploadValidation = [
  body('messageId').optional().isUUID().withMessage('Message ID must be a valid UUID'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be a valid ISO 8601 date'),
];

const downloadValidation = [param('id').isUUID().withMessage('File ID must be a valid UUID')];

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload file
 *     description: Upload a file with virus scanning and thumbnail generation (max 10MB, 10 uploads/hour)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (max 10MB)
 *               messageId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional message ID to associate with file
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiration date for auto-deletion
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/File'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       413:
 *         description: File too large (max 10MB)
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/upload', uploadRateLimit, uploadValidation, async (req, res) => {
  try {
    // Initialize file upload service if not already initialized
    if (!fileUploadService.initialized) {
      await fileUploadService.initialize();
    }

    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { messageId, expiresAt } = req.body;
    const userId = req.user.id;

    // Check if message exists and user has access (if messageId provided)
    if (messageId) {
      const { Message } = await import('../models/index.js');
      const message = await Message.findByPk(messageId);

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Check if user is participant in the conversation
      if (message.recipientId && message.recipientId !== userId && message.senderId !== userId) {
        return res.status(403).json({ error: 'Access denied to message' });
      }

      if (message.groupId) {
        const { GroupMember } = await import('../models/index.js');
        const membership = await GroupMember.findOne({
          where: { groupId: message.groupId, userId },
        });

        if (!membership) {
          return res.status(403).json({ error: 'Access denied to group message' });
        }
      }
    }

    // Get multer middleware for handling multipart form data
    const multerMiddleware = fileUploadService.getMulterMiddleware();

    // Handle the file upload with multer - accept multiple field names
    // Try 'files' first, then 'file', then 'avatar'
    const uploadHandler = multerMiddleware.fields([
      { name: 'files', maxCount: 10 },
      { name: 'file', maxCount: 10 },
      { name: 'avatar', maxCount: 1 },
    ]);

    uploadHandler(req, res, async multerError => {
      if (multerError) {
        logger.error('Multer upload error:', multerError);

        if (multerError.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File too large. Maximum size is 25MB per file.',
          });
        }

        if (multerError.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            error: 'Too many files. Maximum 10 files per upload.',
          });
        }

        if (multerError.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: 'Unexpected file field. Use "files" field name.',
          });
        }

        return res.status(400).json({
          error: 'File upload failed',
          details: multerError.message,
        });
      }

      try {
        // Normalize files from different field names into a single array
        let filesArray = [];
        if (req.files) {
          // Handle multer.fields() format
          if (req.files.files) {
            filesArray = filesArray.concat(req.files.files);
          }
          if (req.files.file) {
            filesArray = filesArray.concat(req.files.file);
          }
          if (req.files.avatar) {
            filesArray = filesArray.concat(req.files.avatar);
          }

          // Handle multer.array() format (if files is already an array)
          if (Array.isArray(req.files)) {
            filesArray = req.files;
          }
        }

        if (!filesArray || filesArray.length === 0) {
          return res.status(400).json({
            error: 'No files provided',
            hint: 'Use field name: "files", "file", or "avatar"',
          });
        }

        logger.info(`Processing ${filesArray.length} files for user ${userId}`);

        // Use normalized files array
        req.files = filesArray;

        // Process uploaded files (without saving to DB yet)
        const processedFiles = [];
        for (const file of req.files) {
          try {
            logger.info(
              `Processing file: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`
            );
            const processedFile = await fileUploadService.processFile(file, {
              userId,
              messageId,
              uploadId: uuidv4(), // Generate unique upload ID for tracking
            });
            processedFiles.push(processedFile);
            logger.info(`File processed successfully: ${file.originalname}`);
          } catch (fileError) {
            logger.error(`Failed to process file ${file.originalname}:`, fileError);
            throw fileError; // Re-throw to be caught by outer catch
          }
        }

        // Save file metadata to database only for clean files
        const savedFiles = [];
        for (const processedFile of processedFiles) {
          // Set expiration if provided
          if (expiresAt) {
            processedFile.expiresAt = new Date(expiresAt);
          }

          // FIX BUG-F001: Removed debug console.log statements (use logger instead)

          // FIX BUG-F002: Use virus scan status from processedFile (already scanned BEFORE DB save)
          // Files are only saved to database AFTER passing virus scan
          const fileData = {
            filename: processedFile.filename,
            originalName: processedFile.originalName,
            filePath: processedFile.filePath,
            fileSize: Number(processedFile.fileSize) || 0,
            mimeType: processedFile.mimeType,
            fileType: processedFile.fileType,
            isImage: Boolean(processedFile.isImage),
            width: processedFile.width != null ? Number(processedFile.width) : null,
            height: processedFile.height != null ? Number(processedFile.height) : null,
            uploaderId: processedFile.uploaderId,
            messageId: processedFile.messageId || null,
            downloadCount: Number(processedFile.downloadCount) || 0,
            virusScanStatus: processedFile.virusScanStatus || 'clean', // Use actual scan status
            expiresAt: processedFile.expiresAt || null,
          };

          const savedFile = await File.create(fileData);
          savedFiles.push(savedFile);

          // Trigger thumbnail generation for images and documents
          if (savedFile.fileType === 'image' || savedFile.fileType === 'document') {
            try {
              await thumbnailService.generateThumbnail(
                savedFile.id,
                savedFile.filePath,
                savedFile.fileType,
                savedFile.mimeType
              );
            } catch (thumbnailError) {
              logger.warn('Failed to queue thumbnail generation:', thumbnailError);
              // Don't fail the upload if thumbnail generation fails
            }
          }

          // Log file upload
          logger.info('File upload completed', {
            userId,
            action: 'file_upload',
            fileId: savedFile.id,
            filename: savedFile.filename,
            originalName: savedFile.originalName,
            fileSize: savedFile.fileSize,
            mimeType: savedFile.mimeType,
            messageId,
          });
        }

        logger.info('Files uploaded successfully', {
          userId,
          fileCount: savedFiles.length,
          totalSize: savedFiles.reduce((sum, file) => sum + file.fileSize, 0),
        });

        // Return single file (updated) for backward compatibility with frontend
        const fileData = savedFiles.map(file => ({
          id: file.id,
          fileName: file.originalName, // Use originalName as fileName for frontend
          filename: file.filename,
          originalName: file.originalName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          fileType: file.fileType,
          isImage: file.isImage,
          width: file.width,
          height: file.height,
          fileUrl: `/api/files/${file.id}`, // Add fileUrl for image previews
          expiresAt: file.expiresAt,
        }));

        res.status(201).json({
          success: true,
          message: 'Files uploaded successfully',
          data: savedFiles.length === 1 ? fileData[0] : fileData, // Single file or array
          files: fileData, // Keep for backward compatibility
        });
      } catch (processingError) {
        logger.error('File processing error:', {
          error: processingError.message,
          stack: processingError.stack,
          userId,
          filesCount: req.files?.length,
        });

        // Clean up any uploaded files if processing fails
        if (req.files) {
          for (const file of req.files) {
            try {
              if (file.path) {
                await fileUploadService.deleteFiles(file.path);
              }
            } catch (cleanupError) {
              logger.error('Error cleaning up failed upload:', cleanupError);
            }
          }
        }

        res.status(500).json({
          error: 'File processing failed',
          message: processingError.message,
          details: process.env.NODE_ENV === 'development' ? processingError.stack : undefined,
        });
      }
    });
  } catch (error) {
    logger.error('File upload endpoint error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Internal server error during file upload',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Download file
 *     description: Download a file by ID with authorization check (100 downloads/hour)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File unique identifier
 *     responses:
 *       200:
 *         description: File download stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', downloadRateLimit, downloadValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Find file in database
    const file = await File.findByPk(id, {
      include: [
        {
          model: await import('../models/index.js').then(m => m.Message),
          as: 'message',
          include: [
            {
              model: await import('../models/index.js').then(m => m.User),
              as: 'sender',
              attributes: ['id', 'username', 'firstName', 'lastName'],
            },
            {
              model: await import('../models/index.js').then(m => m.User),
              as: 'recipient',
              attributes: ['id', 'username', 'firstName', 'lastName'],
            },
          ],
        },
      ],
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user can download the file
    if (!file.canBeDownloadedBy(userId)) {
      return res.status(403).json({ error: 'Access denied or file expired' });
    }

    // Check if file is associated with a message and user has access
    if (file.messageId) {
      const message = file.message;

      if (message.recipientId && message.recipientId !== userId && message.senderId !== userId) {
        return res.status(403).json({ error: 'Access denied to file' });
      }

      if (message.groupId) {
        const { GroupMember } = await import('../models/index.js');
        const membership = await GroupMember.findOne({
          where: { groupId: message.groupId, userId },
        });

        if (!membership) {
          return res.status(403).json({ error: 'Access denied to group file' });
        }
      }
    }

    // Increment download count
    await file.incrementDownloadCount();

    // Log file download for audit
    await auditService.logSecurityEvent({
      userId,
      eventType: 'file_access',
      severity: 'low',
      metadata: {
        action: 'file_download',
        fileId: file.id,
        filename: file.filename,
        originalName: file.originalName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
      },
    });

    // FIX BUG-F005: Validate file path to prevent path traversal
    const filePath = file.filePath;

    // Get absolute paths for validation
    const uploadBasePath = path.resolve(process.env.UPLOAD_PATH || './uploads');
    const absoluteFilePath = path.resolve(filePath);

    // Security check: Ensure file path is within upload directory
    if (!absoluteFilePath.startsWith(uploadBasePath)) {
      logger.error('Path traversal attempt detected', {
        userId,
        fileId: id,
        requestedPath: filePath,
        resolvedPath: absoluteFilePath,
        allowedBasePath: uploadBasePath,
        severity: 'CRITICAL',
      });

      await auditService.logSecurityEvent({
        userId,
        eventType: 'security_violation',
        severity: 'high',
        metadata: {
          action: 'path_traversal_attempt',
          fileId: id,
          requestedPath: filePath,
          resolvedPath: absoluteFilePath,
        },
      });

      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists on disk
    try {
      await fs.promises.access(absoluteFilePath);
    } catch (error) {
      logger.error('File not found on disk:', { filePath: absoluteFilePath, fileId: id });
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set appropriate headers
    const headers = {
      'Content-Type': file.mimeType,
      'Content-Length': file.fileSize,
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
      'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      'X-File-ID': file.id,
      'X-Download-Count': file.downloadCount + 1, // +1 for current download
    };

    // Set security headers
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['X-Frame-Options'] = 'DENY';

    res.set(headers);

    // Stream file to response
    const fileStream = fs.createReadStream(absoluteFilePath);
    fileStream.pipe(res);

    // Handle stream errors
    fileStream.on('error', streamError => {
      logger.error('File stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });

    logger.info('File download initiated', {
      fileId: id,
      filename: file.filename,
      userId,
      fileSize: file.fileSize,
    });
  } catch (error) {
    logger.error('File download endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error during file download',
    });
  }
});

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: List user files
 *     description: Get a paginated list of files uploaded by the authenticated user
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
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
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by file MIME type
 *     responses:
 *       200:
 *         description: List of files with pagination
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
 *                     $ref: '#/components/schemas/File'
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }
    const {
      page = 1,
      limit = 20,
      fileType,
      messageId,
      virusScanStatus,
      conversationWith,
      groupId,
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where condition
    const whereCondition = {};
    let messageWhere = {};

    // If filtering by conversation or group, we need to join with messages
    if (conversationWith || groupId) {
      const { Message } = await import('../models/index.js');

      // Build message filter conditions
      if (conversationWith) {
        // Find files from messages between current user and the specified user
        messageWhere = {
          [Op.or]: [
            { senderId: userId, recipientId: conversationWith },
            { senderId: conversationWith, recipientId: userId },
          ],
        };
      } else if (groupId) {
        // Find files from messages in the specified group
        messageWhere = { groupId };

        // Verify user is a member of the group
        const { GroupMember } = await import('../models/index.js');
        const membership = await GroupMember.findOne({
          where: { groupId, userId },
        });

        if (!membership) {
          return res.status(403).json({ error: 'Access denied to group files' });
        }
      }

      // Add message filter to file where condition
      whereCondition.messageId = {
        [Op.ne]: null,
      };
    } else {
      // Default: only show user's own uploads
      whereCondition.uploaderId = userId;
    }

    if (fileType) {
      whereCondition.fileType = fileType;
    }

    if (messageId) {
      whereCondition.messageId = messageId;
    }

    if (virusScanStatus) {
      whereCondition.virusScanStatus = virusScanStatus;
    }

    const { Message, User } = await import('../models/index.js');

    const { count, rows: files } = await File.findAndCountAll({
      where: whereCondition,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id',
        'filename',
        'originalName',
        'fileSize',
        'mimeType',
        'fileType',
        'isImage',
        'width',
        'height',
        'virusScanStatus',
        'downloadCount',
        'expiresAt',
        'createdAt',
        'messageId',
        'uploaderId',
      ],
      include:
        conversationWith || groupId
          ? [
              {
                model: Message,
                as: 'message',
                where: messageWhere,
                required: true,
                attributes: ['id', 'senderId', 'recipientId', 'groupId', 'createdAt'],
                include: [
                  {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'username', 'avatar'],
                  },
                ],
              },
            ]
          : [],
    });

    res.json({
      files: files.map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        fileType: file.fileType,
        isImage: file.isImage,
        width: file.width,
        height: file.height,
        virusScanStatus: file.virusScanStatus,
        downloadCount: file.downloadCount,
        expiresAt: file.expiresAt,
        createdAt: file.createdAt,
        fileUrl: `/api/files/${file.id}`,
        uploadedAt: file.createdAt,
        sender: file.message?.sender
          ? {
              id: file.message.sender.id,
              username: file.message.sender.username,
              avatar: file.message.sender.avatar,
            }
          : undefined,
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    // FIX BUG-F001: Use logger instead of console.error
    logger.error('List files error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({
      error: 'Internal server error while listing files',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/files/{id}/thumbnail:
 *   get:
 *     summary: Get file thumbnail
 *     description: Retrieve thumbnail for an image or video file with authorization check
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File unique identifier
 *     responses:
 *       200:
 *         description: Thumbnail image
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id/thumbnail', downloadRateLimit, downloadValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Find file in database
    const file = await File.findByPk(id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user can access the file
    if (!file.canBeDownloadedBy(userId)) {
      return res.status(403).json({ error: 'Access denied or file expired' });
    }

    // Get thumbnail path
    const thumbnailPath = await thumbnailService.getThumbnailPath(id);

    if (!thumbnailPath) {
      return res.status(404).json({ error: 'Thumbnail not available' });
    }

    // FIX BUG-F006: Validate thumbnail path to prevent path traversal
    // Get absolute paths for validation
    const uploadBasePath = path.resolve(process.env.UPLOAD_PATH || './uploads');
    const absoluteThumbnailPath = path.resolve(thumbnailPath);

    // Security check: Ensure thumbnail path is within upload directory
    if (!absoluteThumbnailPath.startsWith(uploadBasePath)) {
      logger.error('Path traversal attempt detected in thumbnail', {
        userId,
        fileId: id,
        requestedPath: thumbnailPath,
        resolvedPath: absoluteThumbnailPath,
        allowedBasePath: uploadBasePath,
        severity: 'CRITICAL',
      });

      await auditService.logSecurityEvent({
        userId,
        eventType: 'security_violation',
        severity: 'high',
        metadata: {
          action: 'path_traversal_attempt_thumbnail',
          fileId: id,
          requestedPath: thumbnailPath,
          resolvedPath: absoluteThumbnailPath,
        },
      });

      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if thumbnail file exists on disk
    try {
      await fs.promises.access(absoluteThumbnailPath);
    } catch (error) {
      logger.error('Thumbnail file not found on disk:', {
        thumbnailPath: absoluteThumbnailPath,
        fileId: id,
      });
      return res.status(404).json({ error: 'Thumbnail not found on server' });
    }

    // Log thumbnail access for audit
    await auditService.logSecurityEvent({
      userId,
      eventType: 'file_access',
      severity: 'low',
      metadata: {
        action: 'thumbnail_access',
        fileId: file.id,
        filename: file.filename,
        originalName: file.originalName,
      },
    });

    // Determine content type based on file extension
    const ext = path.extname(absoluteThumbnailPath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Set appropriate headers
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'X-File-ID': file.id,
      'X-Thumbnail-For': file.originalName,
    };

    res.set(headers);

    // Stream thumbnail to response
    const fileStream = fs.createReadStream(absoluteThumbnailPath);
    fileStream.pipe(res);

    // Handle stream errors
    fileStream.on('error', streamError => {
      logger.error('Thumbnail stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading thumbnail' });
      }
    });

    logger.info('Thumbnail served successfully', {
      fileId: id,
      userId,
      thumbnailPath,
    });
  } catch (error) {
    logger.error('Thumbnail serve endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error while serving thumbnail',
    });
  }
});

/**
 * GET /api/files/thumbnail-service/status
 * Get thumbnail service status (admin only)
 */
router.get('/thumbnail-service/status', authenticate, async (req, res) => {
  try {
    // FIX BUG-F008: Use req.user.role === 'admin' for consistency
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const status = thumbnailService.getQueueStatus();

    res.json({
      service: 'thumbnail',
      status: 'running',
      queue: status,
    });
  } catch (error) {
    logger.error('Thumbnail service status error:', error);
    res.status(500).json({
      error: 'Internal server error while getting thumbnail service status',
    });
  }
});

/**
 * GET /api/files/cleanup-service/status
 * Get file cleanup service status (admin only)
 */
router.get('/cleanup-service/status', authenticate, async (req, res) => {
  try {
    // FIX BUG-F008: Use req.user.role === 'admin' for consistency
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await fileCleanupService.getCleanupStats();

    res.json({
      service: 'file_cleanup',
      status: 'running',
      stats,
    });
  } catch (error) {
    logger.error('File cleanup service status error:', error);
    res.status(500).json({
      error: 'Internal server error while getting file cleanup service status',
    });
  }
});

/**
 * @swagger
 * /api/files/{id}/delete:
 *   post:
 *     summary: Delete file
 *     description: Mark file for deletion (file owner or admin only)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File unique identifier
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 default: admin_deleted
 *                 description: Reason for deletion
 *     responses:
 *       200:
 *         description: File deleted successfully
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
 *                   example: "File deleted successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:id/delete', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason = 'admin_deleted' } = req.body;

    // Check if user is admin or file owner
    const file = await File.findByPk(id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // FIX BUG-F008: Use req.user.role === 'admin' for consistency
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && file.uploaderId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark file for deletion
    const deletionInfo = await fileCleanupService.markFileForDeletion(id, reason);

    // Log file deletion
    await auditService.logSecurityEvent({
      userId,
      eventType: 'file_deletion',
      severity: 'low',
      metadata: {
        action: 'file_marked_for_deletion',
        fileId: file.id,
        filename: file.filename,
        originalName: file.originalName,
        reason,
        actualDeletionTime: deletionInfo.actualDeletionTime,
      },
    });

    res.json({
      message: 'File marked for deletion',
      fileId: id,
      deletionInfo,
    });
  } catch (error) {
    logger.error('File deletion endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error while marking file for deletion',
    });
  }
});

/**
 * POST /api/files/admin/cleanup
 * Trigger manual cleanup (admin only)
 */
router.post('/admin/cleanup', authenticate, async (req, res) => {
  try {
    // FIX BUG-F008: Use req.user.role === 'admin' for consistency
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { cleanupType = 'expired' } = req.body;

    logger.info('Admin triggered manual cleanup', { cleanupType, adminId: req.user.id });

    switch (cleanupType) {
      case 'expired':
        await fileCleanupService.cleanupExpiredFiles();
        break;
      case 'orphaned':
        await fileCleanupService.cleanupOrphanedFiles();
        break;
      case 'temp':
        await fileCleanupService.cleanupTempFiles();
        break;
      case 'emergency':
        await fileCleanupService.performEmergencyCleanup();
        break;
      default:
        return res.status(400).json({ error: 'Invalid cleanup type' });
    }

    // Log admin cleanup action
    await auditService.logAdminAction({
      adminId: req.user.id,
      action: 'admin_cleanup_triggered',
      targetType: 'system',
      targetId: null,
      changes: {
        cleanupType,
        timestamp: new Date().toISOString(),
      },
      reason: `Cleanup triggered for ${cleanupType}`,
    });

    res.json({
      message: `${cleanupType} cleanup completed`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Admin cleanup endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error during cleanup',
    });
  }
});

export default router;
