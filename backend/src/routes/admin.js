import express from 'express';
import rateLimit from 'express-rate-limit';

import adminController from '../controllers/adminController.js';
import announcementController from '../controllers/announcementController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logger } from '../middleware/requestLogger.js';

const router = express.Router();

// All admin routes require authentication and admin role
// Combine authenticate and authorize in a single middleware chain
const requireAdminAccess = [authenticate, authorize('admin')];

// BUG-A013: Rate limiting for resource-intensive export operations
const exportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 exports per hour per admin
  message: {
    success: false,
    error: {
      type: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many export requests. Maximum 5 per hour.',
    },
  },
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(requireAdminAccess);

/**
 * @swagger
 * /api/admin/users/pending:
 *   get:
 *     summary: Get pending users for approval
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *     responses:
 *       200:
 *         description: List of pending users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/users/pending', async (req, res) => {
  try {
    await adminController.getPendingUsers(req, res);
  } catch (error) {
    logger.error('Admin pending users error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/users/approve-all:
 *   post:
 *     summary: Approve all pending users (batch operation)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All pending users approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     approvedCount:
 *                       type: integer
 *                     message:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/users/approve-all', async (req, res) => {
  try {
    await adminController.approveAllPendingUsers(req, res);
  } catch (error) {
    logger.error('Admin approve all users error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/approve:
 *   put:
 *     summary: Approve a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: User approved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
router.put('/users/:userId/approve', async (req, res) => {
  try {
    await adminController.approveUser(req, res);
  } catch (error) {
    logger.error('Admin approve user error', {
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
 * /api/admin/users/{userId}/reject:
 *   put:
 *     summary: Reject a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               adminNotes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: User rejected successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
router.put('/users/:userId/reject', async (req, res) => {
  try {
    await adminController.rejectUser(req, res);
  } catch (error) {
    logger.error('Admin reject user error', {
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
 * /api/admin/users/{userId}:
 *   get:
 *     summary: Get a single user by ID with statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
router.get('/users/:userId', async (req, res) => {
  try {
    await adminController.getUserById(req, res);
  } catch (error) {
    logger.error('Admin get user by ID error', {
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
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin view)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: List of all users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/users', async (req, res) => {
  try {
    await adminController.getAllUsers(req, res);
  } catch (error) {
    logger.error('Admin all users error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get comprehensive system statistics
 *     description: Retrieve detailed system statistics including user counts, message counts, file statistics, and system metrics. Admin access required.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comprehensive system statistics retrieved successfully
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
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: Total number of users
 *                           example: 150
 *                         active:
 *                           type: integer
 *                           description: Number of active users
 *                           example: 120
 *                         pending:
 *                           type: integer
 *                           description: Number of pending approval users
 *                           example: 15
 *                         inactive:
 *                           type: integer
 *                           description: Number of inactive users
 *                           example: 10
 *                         suspended:
 *                           type: integer
 *                           description: Number of suspended users
 *                           example: 5
 *                     messages:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: Total number of messages
 *                           example: 50000
 *                         today:
 *                           type: integer
 *                           description: Messages sent today
 *                           example: 1250
 *                         thisWeek:
 *                           type: integer
 *                           description: Messages sent this week
 *                           example: 8500
 *                         thisMonth:
 *                           type: integer
 *                           description: Messages sent this month
 *                           example: 32000
 *                     files:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: Total number of files
 *                           example: 3200
 *                         totalSize:
 *                           type: integer
 *                           description: Total storage used in bytes
 *                           example: 5368709120
 *                     groups:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: Total number of groups
 *                           example: 45
 *                         active:
 *                           type: integer
 *                           description: Number of active groups
 *                           example: 38
 *                     calls:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: Total number of calls
 *                           example: 850
 *                         today:
 *                           type: integer
 *                           description: Calls made today
 *                           example: 25
 *                         averageDuration:
 *                           type: integer
 *                           description: Average call duration in seconds
 *                           example: 420
 *                     sessions:
 *                       type: object
 *                       properties:
 *                         active:
 *                           type: integer
 *                           description: Number of active sessions
 *                           example: 75
 *                     system:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: integer
 *                           description: System uptime in seconds
 *                           example: 86400
 *                         memory:
 *                           type: object
 *                           properties:
 *                             rss:
 *                               type: integer
 *                               description: Resident set size in bytes
 *                             heapTotal:
 *                               type: integer
 *                               description: Total heap size in bytes
 *                             heapUsed:
 *                               type: integer
 *                               description: Used heap size in bytes
 *                         platform:
 *                           type: string
 *                           description: Operating system platform
 *                           example: linux
 *                         nodeVersion:
 *                           type: string
 *                           description: Node.js version
 *                           example: v18.17.0
 *       401:
 *         description: Unauthorized - No token provided or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', async (req, res) => {
  try {
    await adminController.getStatistics(req, res);
  } catch (error) {
    logger.error('Admin stats error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/deactivate:
 *   put:
 *     summary: Deactivate a user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               adminNotes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Cannot deactivate admins
 *       404:
 *         description: User not found
 */
router.put('/users/:userId/deactivate', async (req, res) => {
  try {
    await adminController.deactivateUser(req, res);
  } catch (error) {
    logger.error('Admin deactivate user error', {
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
 * /api/admin/users/{userId}/reactivate:
 *   put:
 *     summary: Reactivate a user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: User reactivated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
router.put('/users/:userId/reactivate', async (req, res) => {
  try {
    await adminController.reactivateUser(req, res);
  } catch (error) {
    logger.error('Admin reactivate user error', {
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
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get audit logs with filtering
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *     responses:
 *       200:
 *         description: List of audit logs
 */
router.get('/audit-logs', async (req, res) => {
  try {
    await adminController.getAuditLogs(req, res);
  } catch (error) {
    logger.error('Admin audit logs error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: Get user reports with filtering
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, investigating, resolved, dismissed]
 *     responses:
 *       200:
 *         description: List of reports
 */
router.get('/reports', async (req, res) => {
  try {
    await adminController.getReports(req, res);
  } catch (error) {
    logger.error('Admin reports error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/reports/{reportId}/resolve:
 *   put:
 *     summary: Resolve a report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolution
 *               - actionTaken
 *             properties:
 *               resolution:
 *                 type: string
 *                 minLength: 10
 *               actionTaken:
 *                 type: string
 *                 enum: [no_action, warning_issued, content_removed, user_suspended, user_banned, other]
 *     responses:
 *       200:
 *         description: Report resolved successfully
 */
router.put('/reports/:reportId/resolve', async (req, res) => {
  try {
    await adminController.resolveReport(req, res);
  } catch (error) {
    logger.error('Admin resolve report error', {
      requestId: req.id,
      reportId: req.params.reportId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/export/audit-logs/csv:
 *   get:
 *     summary: Export audit logs to CSV
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           format: binary
 */
router.get('/export/audit-logs/csv', exportRateLimit, async (req, res) => {
  try {
    await adminController.exportAuditLogsCSV(req, res);
  } catch (error) {
    logger.error('Admin export audit logs CSV error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/export/audit-logs/pdf:
 *   get:
 *     summary: Export audit logs to PDF
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/audit-logs/pdf', exportRateLimit, async (req, res) => {
  try {
    await adminController.exportAuditLogsPDF(req, res);
  } catch (error) {
    logger.error('Admin export audit logs PDF error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/export/reports/csv:
 *   get:
 *     summary: Export reports to CSV
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, investigating, resolved, dismissed]
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [harassment, spam, inappropriate_content, hate_speech, violence, impersonation, malware, other]
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: [user, message, file, other]
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/reports/csv', exportRateLimit, async (req, res) => {
  try {
    await adminController.exportReportsCSV(req, res);
  } catch (error) {
    logger.error('Admin export reports CSV error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/export/reports/pdf:
 *   get:
 *     summary: Export reports to PDF
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, investigating, resolved, dismissed]
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [harassment, spam, inappropriate_content, hate_speech, violence, impersonation, malware, other]
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: [user, message, file, other]
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/reports/pdf', exportRateLimit, async (req, res) => {
  try {
    await adminController.exportReportsPDF(req, res);
  } catch (error) {
    logger.error('Admin export reports PDF error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/export/statistics/csv:
 *   get:
 *     summary: Export system statistics to CSV
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/statistics/csv', exportRateLimit, async (req, res) => {
  try {
    await adminController.exportStatisticsCSV(req, res);
  } catch (error) {
    logger.error('Admin export statistics CSV error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/export/statistics/pdf:
 *   get:
 *     summary: Export system statistics to PDF
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/statistics/pdf', exportRateLimit, async (req, res) => {
  try {
    await adminController.exportStatisticsPDF(req, res);
  } catch (error) {
    logger.error('Admin export statistics PDF error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get system settings
 *     description: Retrieve all system settings including feature flags, rate limits, and configuration. Admin access required.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System settings retrieved successfully
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
 *                     messageRetention:
 *                       type: integer
 *                       description: Message retention period in days
 *                       example: 30
 *                     maxFileSize:
 *                       type: integer
 *                       description: Maximum file size in MB
 *                       example: 25
 *                     maxGroupSize:
 *                       type: integer
 *                       description: Maximum group size
 *                       example: 20
 *                     registrationApprovalMode:
 *                       type: string
 *                       enum: [manual, auto]
 *                       example: manual
 *                     maintenanceMode:
 *                       type: boolean
 *                       example: false
 *                     featureFlags:
 *                       type: object
 *                       properties:
 *                         fileSharing:
 *                           type: boolean
 *                         videoCalling:
 *                           type: boolean
 *                         groupChats:
 *                           type: boolean
 *                         endToEndEncryption:
 *                           type: boolean
 *                     rateLimiting:
 *                       type: object
 *                       properties:
 *                         loginAttempts:
 *                           type: integer
 *                         apiRequestsPerMinute:
 *                           type: integer
 *                         messagesPerMinute:
 *                           type: integer
 *                     notifications:
 *                       type: object
 *                       properties:
 *                         emailEnabled:
 *                           type: boolean
 *                         pushEnabled:
 *                           type: boolean
 *                         inAppEnabled:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/settings', async (req, res) => {
  try {
    await adminController.getSystemSettings(req, res);
  } catch (error) {
    logger.error('Admin get settings error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/settings:
 *   put:
 *     summary: Update system settings
 *     description: Update system-wide configuration. All fields are optional. Admin access required.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageRetention:
 *                 type: integer
 *                 minimum: 7
 *                 maximum: 365
 *                 description: Message retention period in days
 *               maxFileSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Maximum file size in MB
 *               maxGroupSize:
 *                 type: integer
 *                 minimum: 2
 *                 maximum: 50
 *                 description: Maximum group size
 *               registrationApprovalMode:
 *                 type: string
 *                 enum: [manual, auto]
 *               maintenanceMode:
 *                 type: boolean
 *               featureFlags:
 *                 type: object
 *                 properties:
 *                   fileSharing:
 *                     type: boolean
 *                   videoCalling:
 *                     type: boolean
 *                   groupChats:
 *                     type: boolean
 *                   endToEndEncryption:
 *                     type: boolean
 *               rateLimiting:
 *                 type: object
 *                 properties:
 *                   loginAttempts:
 *                     type: integer
 *                     minimum: 3
 *                     maximum: 10
 *                   apiRequestsPerMinute:
 *                     type: integer
 *                     minimum: 10
 *                     maximum: 1000
 *                   messagesPerMinute:
 *                     type: integer
 *                     minimum: 10
 *                     maximum: 100
 *               notifications:
 *                 type: object
 *                 properties:
 *                   emailEnabled:
 *                     type: boolean
 *                   pushEnabled:
 *                     type: boolean
 *                   inAppEnabled:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put('/settings', async (req, res) => {
  try {
    await adminController.updateSystemSettings(req, res);
  } catch (error) {
    logger.error('Admin update settings error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/announcements:
 *   get:
 *     summary: Get all announcements (admin view)
 *     description: Retrieve all announcements including expired ones. Admin access required.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Announcements retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/announcements', async (req, res) => {
  try {
    await announcementController.getAllAnnouncements(req, res);
  } catch (error) {
    logger.error('Admin get announcements error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/announcements:
 *   post:
 *     summary: Create a new announcement
 *     description: Create a system-wide announcement. Admin access required.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *               message:
 *                 type: string
 *                 minLength: 10
 *               link:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Announcement created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/announcements', async (req, res) => {
  try {
    await announcementController.createAnnouncement(req, res);
  } catch (error) {
    logger.error('Admin create announcement error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/announcements/{announcementId}:
 *   put:
 *     summary: Update an announcement
 *     description: Update an existing announcement. Admin access required.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *               message:
 *                 type: string
 *                 minLength: 10
 *               link:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Announcement updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Announcement not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put('/announcements/:announcementId', async (req, res) => {
  try {
    await announcementController.updateAnnouncement(req, res);
  } catch (error) {
    logger.error('Admin update announcement error', {
      requestId: req.id,
      announcementId: req.params.announcementId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/announcements/{announcementId}:
 *   delete:
 *     summary: Delete an announcement
 *     description: Delete an announcement. Admin access required.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Announcement deleted successfully
 *       404:
 *         description: Announcement not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.delete('/announcements/:announcementId', async (req, res) => {
  try {
    await announcementController.deleteAnnouncement(req, res);
  } catch (error) {
    logger.error('Admin delete announcement error', {
      requestId: req.id,
      announcementId: req.params.announcementId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

router.get('/monitoring', async (req, res) => {
  try {
    await adminController.getMonitoringData(req, res);
  } catch (error) {
    logger.error('Admin get monitoring data error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

export default router;
