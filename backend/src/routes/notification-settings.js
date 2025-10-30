import express from 'express';
import { body, query, validationResult } from 'express-validator';

import notificationSettingsController from '../controllers/notificationSettingsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/notification-settings:
 *   get:
 *     summary: Get user's notification settings
 *     tags: [Notification Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification settings retrieved successfully
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
 *                   example: "Notification settings retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         userId:
 *                           type: string
 *                           format: uuid
 *                         inAppEnabled:
 *                           type: boolean
 *                         emailEnabled:
 *                           type: boolean
 *                         pushEnabled:
 *                           type: boolean
 *                         quietHoursStart:
 *                           type: string
 *                           format: time
 *                           nullable: true
 *                         quietHoursEnd:
 *                           type: string
 *                           format: time
 *                           nullable: true
 *                         doNotDisturb:
 *                           type: boolean
 *                         messageNotifications:
 *                           type: boolean
 *                         callNotifications:
 *                           type: boolean
 *                         mentionNotifications:
 *                           type: boolean
 *                         adminNotifications:
 *                           type: boolean
 *                         systemNotifications:
 *                           type: boolean
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', notificationSettingsController.getSettings);

/**
 * @swagger
 * /api/notification-settings:
 *   put:
 *     summary: Update user's notification settings
 *     tags: [Notification Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               inAppEnabled:
 *                 type: boolean
 *                 description: Enable/disable in-app notifications
 *               emailEnabled:
 *                 type: boolean
 *                 description: Enable/disable email notifications
 *               pushEnabled:
 *                 type: boolean
 *                 description: Enable/disable push notifications
 *               quietHoursStart:
 *                 type: string
 *                 format: time
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                 description: Start time for quiet hours (HH:MM format)
 *               quietHoursEnd:
 *                 type: string
 *                 format: time
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                 description: End time for quiet hours (HH:MM format)
 *               doNotDisturb:
 *                 type: boolean
 *                 description: Enable/disable do not disturb mode
 *               messageNotifications:
 *                 type: boolean
 *                 description: Enable/disable message notifications
 *               callNotifications:
 *                 type: boolean
 *                 description: Enable/disable call notifications
 *               mentionNotifications:
 *                 type: boolean
 *                 description: Enable/disable mention notifications
 *               adminNotifications:
 *                 type: boolean
 *                 description: Enable/disable admin notifications
 *               systemNotifications:
 *                 type: boolean
 *                 description: Enable/disable system notifications
 *     responses:
 *       200:
 *         description: Notification settings updated successfully
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
 *                   example: "Notification settings updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/NotificationSettings'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put(
  '/',
  [
    body('inAppEnabled').optional().isBoolean().withMessage('In-app enabled must be a boolean'),
    body('emailEnabled').optional().isBoolean().withMessage('Email enabled must be a boolean'),
    body('pushEnabled').optional().isBoolean().withMessage('Push enabled must be a boolean'),
    body('quietHoursStart')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Quiet hours start must be in HH:MM format'),
    body('quietHoursEnd')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Quiet hours end must be in HH:MM format'),
    body('doNotDisturb').optional().isBoolean().withMessage('Do not disturb must be a boolean'),
    body('messageNotifications')
      .optional()
      .isBoolean()
      .withMessage('Message notifications must be a boolean'),
    body('callNotifications')
      .optional()
      .isBoolean()
      .withMessage('Call notifications must be a boolean'),
    body('mentionNotifications')
      .optional()
      .isBoolean()
      .withMessage('Mention notifications must be a boolean'),
    body('adminNotifications')
      .optional()
      .isBoolean()
      .withMessage('Admin notifications must be a boolean'),
    body('systemNotifications')
      .optional()
      .isBoolean()
      .withMessage('System notifications must be a boolean'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: errors.array(),
        },
      });
    }
    next();
  },
  notificationSettingsController.updateSettings
);

/**
 * @swagger
 * /api/notification-settings/reset:
 *   post:
 *     summary: Reset notification settings to defaults
 *     tags: [Notification Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification settings reset successfully
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
 *                   example: "Notification settings reset to defaults successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/NotificationSettings'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/reset', notificationSettingsController.resetSettings);

/**
 * @swagger
 * /api/notification-settings/preview:
 *   get:
 *     summary: Preview how current settings would affect notifications
 *     tags: [Notification Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: notificationType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [message, call, mention, admin, system]
 *         description: Type of notification to preview
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [inApp, email, push]
 *           default: inApp
 *         description: Notification channel to preview
 *     responses:
 *       200:
 *         description: Preview generated successfully
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
 *                   example: "Notification settings preview generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentSettings:
 *                       type: object
 *                       properties:
 *                         notificationType:
 *                           type: string
 *                         channel:
 *                           type: string
 *                         wouldReceive:
 *                           type: boolean
 *                         isInQuietHours:
 *                           type: boolean
 *                         doNotDisturb:
 *                           type: boolean
 *                     preview:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           scenario:
 *                             type: string
 *                           time:
 *                             type: string
 *                           inQuietHours:
 *                             type: boolean
 *                           doNotDisturb:
 *                             type: boolean
 *                           wouldReceive:
 *                             type: boolean
 *                           reason:
 *                             type: string
 *                     settings:
 *                       $ref: '#/components/schemas/NotificationSettings'
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/preview',
  [
    query('notificationType')
      .isIn(['message', 'call', 'mention', 'admin', 'system'])
      .withMessage('Invalid notification type'),
    query('channel')
      .optional()
      .isIn(['inApp', 'email', 'push'])
      .withMessage('Invalid notification channel'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array(),
        },
      });
    }
    next();
  },
  notificationSettingsController.previewSettings
);

export default router;
