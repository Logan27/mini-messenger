import express from 'express';
import { body } from 'express-validator';

import twoFactorController from '../controllers/twoFactorController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: 2FA
 *   description: Two-Factor Authentication management
 */

/**
 * @swagger
 * /api/auth/2fa/setup:
 *   post:
 *     summary: Generate 2FA secret and QR code
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup initiated successfully
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
 *                     secret:
 *                       type: string
 *                     qrCode:
 *                       type: string
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *                     manualEntryKey:
 *                       type: string
 *       400:
 *         description: 2FA already enabled
 *       401:
 *         description: Unauthorized
 */
router.post('/setup', authenticate, twoFactorController.setup);

/**
 * @swagger
 * /api/auth/2fa/verify:
 *   post:
 *     summary: Verify TOTP code and enable 2FA
 *     tags: [2FA]
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
 *                 description: 6-digit TOTP code
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 *       400:
 *         description: Invalid token or 2FA already enabled
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/verify',
  authenticate,
  [
    body('token')
      .notEmpty()
      .withMessage('TOTP token is required')
      .isString()
      .isLength({ min: 6, max: 8 })
      .withMessage('Token must be 6-8 characters'),
  ],
  validate,
  twoFactorController.verify
);

/**
 * @swagger
 * /api/auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - token
 *             properties:
 *               password:
 *                 type: string
 *               token:
 *                 type: string
 *                 description: Current TOTP code or backup code
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 *       400:
 *         description: Invalid credentials or 2FA not enabled
 *       401:
 *         description: Unauthorized or invalid password
 */
router.post(
  '/disable',
  authenticate,
  [
    body('password').notEmpty().withMessage('Password is required'),
    body('token')
      .notEmpty()
      .withMessage('Authentication code is required')
      .isString()
      .isLength({ min: 6, max: 8 })
      .withMessage('Token must be 6-8 characters'),
  ],
  validate,
  twoFactorController.disable
);

/**
 * @swagger
 * /api/auth/2fa/regenerate-backup-codes:
 *   post:
 *     summary: Regenerate backup codes
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Backup codes regenerated successfully
 *       400:
 *         description: 2FA not enabled
 *       401:
 *         description: Unauthorized or invalid password
 */
router.post(
  '/regenerate-backup-codes',
  authenticate,
  [body('password').notEmpty().withMessage('Password is required')],
  validate,
  twoFactorController.regenerateBackupCodes
);

/**
 * @swagger
 * /api/auth/2fa/status:
 *   get:
 *     summary: Get 2FA status
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA status retrieved successfully
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
 *                     twoFactorEnabled:
 *                       type: boolean
 *                     hasBackupCodes:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/status', authenticate, twoFactorController.getStatus);

/**
 * @swagger
 * /api/auth/2fa/validate:
 *   post:
 *     summary: Validate TOTP token or backup code (used during login)
 *     tags: [2FA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - token
 *             properties:
 *               username:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token validated successfully
 *       400:
 *         description: Invalid token
 *       404:
 *         description: User not found
 */
router.post(
  '/validate',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('token')
      .notEmpty()
      .withMessage('Token is required')
      .isString()
      .isLength({ min: 6, max: 8 })
      .withMessage('Token must be 6-8 characters'),
  ],
  validate,
  twoFactorController.validate
);

export default router;
