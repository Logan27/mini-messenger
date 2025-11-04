import express from 'express';

import authController from '../controllers/authController.js';
import {
  authenticate,
  loginRateLimit,
  registerRateLimit,
  passwordResetRateLimit
} from '../middleware/auth.js';
import { authValidation, validate, validateParams } from '../utils/validation.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 pattern: '^[a-zA-Z0-9]+$'
 *                 description: Unique username (alphanumeric only)
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 description: Valid email address
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$'
 *                 description: Strong password with uppercase, lowercase, number, and special character
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *                 description: User's first name (optional)
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *                 description: User's last name (optional)
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *                 description: Avatar image URL (optional)
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post('/register', registerRateLimit, validate(authValidation.register), authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Username or email address
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Invalid credentials or account locked
 *       423:
 *         description: Account is locked due to failed attempts
 *       500:
 *         description: Internal server error
 */
router.post('/login', loginRateLimit, validate(authValidation.login), authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Invalid or expired refresh token
 *       500:
 *         description: Internal server error
 */
router.post('/refresh', validate(authValidation.refreshToken), authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Invalidate current session token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout user from all devices
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     tags: [Authentication]
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
 *                 pattern: '^[a-f0-9]{32}$'
 *                 description: Email verification token (32 character hex string)
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Internal server error
 */
router.post(
  '/verify-email',
  validate(authValidation.verifyEmail),
  authController.verifyEmail
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address associated with the account
 *     responses:
 *       200:
 *         description: Password reset email sent (if email exists)
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post(
  '/forgot-password',
  passwordResetRateLimit,
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *                 pattern: '^[a-f0-9]{64}$'
 *                 description: Password reset token (64 character hex string)
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$'
 *                 description: New password meeting security requirements
 *               confirmPassword:
 *                 type: string
 *                 description: Password confirmation (must match password)
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid input data or expired token
 *       500:
 *         description: Internal server error
 */
router.post(
  '/reset-password',
  passwordResetRateLimit,
  validate(authValidation.resetPassword),
  authController.resetPassword
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/me', authenticate, authController.getProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$'
 *                 description: New password meeting security requirements
 *               confirmPassword:
 *                 type: string
 *                 description: Password confirmation (must match newPassword)
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input data or passwords don't match
 *       401:
 *         description: Invalid current password
 *       500:
 *         description: Internal server error
 */
router.post('/change-password', authenticate, validate(authValidation.changePassword), authController.changePassword);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend email verification
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to resend verification to
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/resend-verification', authController.resendVerification);

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: Get all active sessions for the current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
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
 *                   example: "Sessions retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           deviceType:
 *                             type: string
 *                             enum: [desktop, mobile, tablet]
 *                           browser:
 *                             type: string
 *                           os:
 *                             type: string
 *                           ip:
 *                             type: string
 *                           location:
 *                             type: string
 *                           lastActivity:
 *                             type: string
 *                             format: date-time
 *                           isCurrent:
 *                             type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/sessions', authenticate, authController.getSessions);

/**
 * @swagger
 * /api/auth/sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID to revoke
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *       400:
 *         description: Cannot revoke current session
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 *       500:
 *         description: Internal server error
 */
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);

/**
 * @swagger
 * /api/auth/sessions:
 *   delete:
 *     summary: Revoke all other sessions (keep current)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All other sessions revoked successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/sessions', authenticate, authController.revokeAllOtherSessions);

export default router;
