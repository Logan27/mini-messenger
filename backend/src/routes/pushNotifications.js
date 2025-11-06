import express from 'express';
import { body } from 'express-validator';

import pushNotificationController from '../controllers/pushNotificationController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Push Notifications
 *   description: Push notification token management
 */

/**
 * @swagger
 * /api/push/register:
 *   post:
 *     summary: Register a device token for push notifications
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device token
 *               deviceType:
 *                 type: string
 *                 enum: [web, android, ios]
 *                 default: web
 *               deviceName:
 *                 type: string
 *                 description: Optional device name
 *     responses:
 *       201:
 *         description: Device token registered successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/register',
  authenticate,
  [
    body('token').notEmpty().withMessage('Device token is required'),
    body('deviceType')
      .optional()
      .isIn(['web', 'android', 'ios'])
      .withMessage('Device type must be web, android, or ios'),
    body('deviceName').optional().isString().trim(),
  ],
  validate,
  pushNotificationController.registerToken
);

/**
 * @swagger
 * /api/push/unregister:
 *   post:
 *     summary: Unregister a device token
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device token to unregister
 *     responses:
 *       200:
 *         description: Device token unregistered successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/unregister',
  authenticate,
  [body('token').notEmpty().withMessage('Device token is required')],
  validate,
  pushNotificationController.unregisterToken
);

/**
 * @swagger
 * /api/push/tokens:
 *   get:
 *     summary: Get all device tokens for the current user
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Device tokens retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/tokens', authenticate, pushNotificationController.getTokens);

/**
 * @swagger
 * /api/push/test:
 *   post:
 *     summary: Send a test push notification
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test notification sent
 *       400:
 *         description: No device tokens registered
 *       401:
 *         description: Unauthorized
 */
router.post('/test', authenticate, pushNotificationController.testNotification);

/**
 * @swagger
 * /api/push/status:
 *   get:
 *     summary: Check push notification status
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Push notification status retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/status', authenticate, pushNotificationController.getStatus);

export default router;
