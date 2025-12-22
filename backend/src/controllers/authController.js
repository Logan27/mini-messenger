import crypto from 'crypto';

import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';
import { getRedisClient } from '../config/redis.js';
import { User, Session } from '../models/index.js';
import auditService from '../services/auditService.js';
import emailService from '../services/emailService.js';
import { generateTokens } from '../utils/jwt.js';
import logger from '../utils/logger.js';

class AuthController {
  async register(req, res) {
    try {
      const { username, email, password, firstName, lastName, avatar } = req.body;

      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ username }, { email }],
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            type: 'USER_EXISTS',
            message:
              existingUser.username === username
                ? 'Username is already taken'
                : 'Email is already registered',
          },
        });
      }

      const autoVerifyEmail =
        process.env.AUTO_VERIFY_EMAIL === 'true' || process.env.NODE_ENV !== 'production';
      const emailVerified = autoVerifyEmail;
      const emailVerificationToken = autoVerifyEmail ? null : uuidv4().replace(/-/g, '');

      const user = await User.create({
        username,
        email,
        passwordHash: password,
        firstName,
        lastName,
        avatar,
        emailVerified,
        emailVerificationToken,
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        termsVersion: '1.0',
        privacyVersion: '1.0',
      });

      if (!autoVerifyEmail) {
        try {
          await emailService.sendWelcomeEmail(user);
          await emailService.sendAdminNotification(user);
          logger.info(`Welcome email sent to ${user.email}`);
        } catch (emailError) {
          logger.error('Failed to send welcome email:', emailError);
        }
      }

      const successMessage = autoVerifyEmail
        ? 'Registration successful. Your email has been automatically verified.'
        : 'Registration successful. Please check your email to verify your account.';

      return res.status(201).json({
        success: true,
        message: successMessage,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);

      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
          },
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Registration failed. Please try again.',
        },
      });
    }
  }

  async login(req, res) {
    try {
      const { identifier, password } = req.body;

      const autoVerifyEmail =
        process.env.AUTO_VERIFY_EMAIL === 'true' || process.env.NODE_ENV !== 'production';

      const user = await User.findByEmailOrUsername(identifier);

      if (!user) {
        // Log failed login attempt
        await auditService.logAuthEvent({
          userId: null,
          action: 'user_login_failed',
          details: {
            identifier: identifier,
            reason: 'user_not_found',
          },
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent'),
          severity: 'medium',
          status: 'failure',
          errorMessage: 'Invalid credentials',
        });

        return res.status(401).json({
          success: false,
          error: {
            type: 'INVALID_CREDENTIALS',
            message: 'Invalid username/email or password',
          },
        });
      }

      if (typeof user.isLocked === 'function' && user.isLocked()) {
        const remainingTime = Math.ceil((user.lockedUntil - new Date()) / (1000 * 60));
        return res.status(423).json({
          success: false,
          error: {
            type: 'ACCOUNT_LOCKED',
            message: `Account is locked. Try again in ${remainingTime} minutes`,
          },
        });
      }

      if (!user.emailVerified && !autoVerifyEmail) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email address before logging in',
          },
        });
      }

      // Check approval status
      if (user.approvalStatus !== 'approved') {
        const statusMessages = {
          pending: 'Your account is pending admin approval',
          rejected: 'Your account registration was rejected',
        };

        return res.status(403).json({
          success: false,
          error: {
            type: 'ACCOUNT_NOT_APPROVED',
            message: statusMessages[user.approvalStatus] || 'Your account is not approved',
            approvalStatus: user.approvalStatus,
          },
        });
      }

      const isValidPassword = await user.comparePassword(password);

      if (!isValidPassword) {
        if (typeof user.incrementFailedAttempts === 'function') {
          await user.incrementFailedAttempts();
        }

        // Log failed login attempt (invalid password)
        await auditService.logAuthEvent({
          userId: user.id,
          action: 'user_login_failed',
          details: {
            username: user.username,
            email: user.email,
            reason: 'invalid_password',
          },
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent'),
          severity: 'medium',
          status: 'failure',
          errorMessage: 'Invalid password',
        });

        return res.status(401).json({
          success: false,
          error: {
            type: 'INVALID_CREDENTIALS',
            message: 'Invalid username/email or password',
          },
        });
      }

      if (typeof user.resetFailedAttempts === 'function') {
        await user.resetFailedAttempts();
      }

      user.lastLoginAt = new Date();
      await user.save();

      const { accessToken, refreshToken } = generateTokens(user);

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for refresh token
      const session = await Session.create({
        userId: user.id,
        refreshToken,
        deviceInfo: {
          userAgent: req.get('User-Agent'),
          platform: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop',
        },
        ipAddress: req.ip || req.connection?.remoteAddress,
        expiresAt,
      });

      await AuthController.storeSessionInRedis(session);

      logger.info(`User logged in: ${user.username} (${user.email})`);

      // Log successful login to audit log
      await auditService.logAuthEvent({
        userId: user.id,
        action: 'user_login',
        details: {
          username: user.username,
          email: user.email,
          loginMethod: 'password',
        },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        severity: 'low',
        status: 'success',
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
            lastLoginAt: user.lastLoginAt,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
          session,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Login failed. Please try again.',
        },
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'INVALID_TOKEN',
            message: 'Refresh token is required',
          },
        });
      }

      const session = await Session.findByRefreshToken(refreshToken);

      const sessionExpired =
        !session ||
        (typeof session.isExpired === 'function' && session.isExpired()) ||
        (session?.expiresAt && new Date(session.expiresAt) < new Date());

      if (sessionExpired) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'INVALID_TOKEN',
            message: 'Invalid or expired refresh token',
          },
        });
      }

      const user = await User.findByPk(session.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'INVALID_TOKEN',
            message: 'Invalid or expired refresh token',
          },
        });
      }

      if (user.status === 'inactive') {
        return res.status(403).json({
          success: false,
          error: {
            type: 'USER_INACTIVE',
            message: 'User account is inactive',
          },
        });
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

      session.token = accessToken;
      session.refreshToken = newRefreshToken;
      session.lastAccessedAt = new Date();
      await session.save();

      // Ensure session is fully committed before storing in Redis and returning
      // This prevents race conditions where mobile clients immediately retry with new token
      await session.reload();

      try {
        await AuthController.storeSessionInRedis(session);
      } catch (redisError) {
        logger.warn('Failed to update session in Redis:', redisError);
      }

      logger.info(`Token refreshed for user: ${user.username}`);

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken,
            refreshToken: newRefreshToken,
            expiresAt: session.expiresAt,
          },
        },
      });
    } catch (error) {
      logger.error('Token refresh error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Token refresh failed. Please try again.',
        },
      });
    }
  }

  async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'TOKEN_MISSING',
            message: 'Access token is required',
          },
        });
      }

      let session;
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Find session using the refresh token
        session = await Session.findOne({
          where: {
            refreshToken,
            userId: req.user.id,
          },
        });
      } else {
        // If no refresh token provided (legacy client), we can't identify the specific DB session
        // But we can still proceed to blacklist the access token in Redis
        logger.debug(`Logout called without refreshToken for user ${req.user.id}`);
      }

      if (session) {
        await session.destroy();
      } else if (refreshToken) {
        // If refresh token was provided but not found, it might be already invalid/removed
        logger.warn('Logout: Session not found for provided refresh token');
      }



      try {
        await AuthController.removeSessionFromRedis(token);
      } catch (redisError) {
        logger.warn('Failed to remove session from Redis:', redisError);
      }

      logger.info(`User logged out: ${req.user.username}`, { userId: req.user.id });

      // Log logout to audit log
      await auditService.logAuthEvent({
        userId: req.user.id,
        action: 'user_logout',
        details: {
          username: req.user.username,
          email: req.user.email,
        },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        severity: 'low',
        status: 'success',
      });

      return res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Logout failed. Please try again.',
        },
      });
    }
  }

  async logoutAll(req, res) {
    try {
      const userId = req.user.id;

      const sessions = await Session.findValidSessionsByUserId(userId);

      for (const session of sessions) {
        await Session.destroy({ where: { id: session.id } });
        try {
          await AuthController.removeSessionFromRedis(session.token);
        } catch (redisError) {
          logger.warn('Failed to remove session from Redis:', redisError);
        }
      }

      logger.info(`User logged out from all devices: ${req.user.username}`);

      return res.status(200).json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      logger.error('Logout all error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Logout from all devices failed. Please try again.',
        },
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!token || token.length !== 32) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'INVALID_TOKEN',
            message: 'Invalid or missing verification token',
          },
        });
      }

      // FIX BUG-AUTH-007: Add email verification token expiration check
      const user = await User.findOne({
        where: { emailVerificationToken: token },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'INVALID_TOKEN',
            message: 'Invalid or expired verification token',
          },
        });
      }

      // Check if token has expired (24 hours)
      if (user.emailVerificationExpires && new Date(user.emailVerificationExpires) < new Date()) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'TOKEN_EXPIRED',
            message: 'Verification token has expired. Please request a new verification email.',
          },
        });
      }

      user.emailVerified = true;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully.',
      });
    } catch (error) {
      logger.error('Email verification error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Email verification failed. Please try again.',
        },
      });
    }
  }

  async resendVerification(req, res) {
    try {
      const email = req.body.email || req.user?.email;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Email is required to resend verification.',
          },
        });
      }

      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'USER_NOT_FOUND',
            message: 'User not found for the provided email.',
          },
        });
      }

      if (user.emailVerified) {
        return res.status(200).json({
          success: true,
          message: 'Email is already verified.',
        });
      }

      user.emailVerificationToken = uuidv4().replace(/-/g, '');
      await user.save();

      try {
        await emailService.sendEmailVerification(user);
      } catch (emailError) {
        logger.error('Failed to send verification email:', emailError);
        return res.status(500).json({
          success: false,
          error: {
            type: 'EMAIL_DELIVERY_FAILED',
            message: 'Failed to send verification email. Please try again later.',
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Verification email resent successfully.',
      });
    } catch (error) {
      logger.error('Resend verification error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to resend verification email. Please try again.',
        },
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({
        where: { email },
      });

      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
        });
      }

      // Generate 64-character hex token (32 bytes = 64 hex chars)
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      try {
        await emailService.sendPasswordReset(user);
        logger.info(`Password reset email sent to ${user.email}`);
      } catch (emailError) {
        logger.error('Failed to send password reset email:', emailError);
      }

      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      logger.error('Forgot password error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Password reset request failed. Please try again.',
        },
      });
    }
  }

  async resetPassword(req, res) {
    // FIX BUG-AUTH-001 & BUG-AUTH-002: Add transaction and prevent token reuse via race condition
    const transaction = await sequelize.transaction();
    try {
      const { token, password } = req.body;

      if (!token || token.length !== 64) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            type: 'INVALID_TOKEN',
            message: 'Invalid or missing reset token',
          },
        });
      }

      // Use SELECT FOR UPDATE to lock the row and prevent race condition
      const user = await User.findOne({
        where: {
          passwordResetToken: token,
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!user || !user.passwordResetExpires || new Date(user.passwordResetExpires) < new Date()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            type: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token',
          },
        });
      }

      // Check password history (prevent reuse of last 3 passwords)
      const isInHistory = await user.isPasswordInHistory(password);
      if (isInHistory) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            type: 'PASSWORD_IN_HISTORY',
            message:
              'You cannot reuse one of your last 3 passwords. Please choose a different password.',
          },
        });
      }

      // IMMEDIATELY invalidate token BEFORE password change to prevent reuse
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save({ transaction });

      // Now change password
      user.passwordHash = password;
      await user.save({ transaction });

      await Session.expireAllUserSessions(user.id, { transaction });

      // Commit transaction before sending email
      await transaction.commit();

      // Send email notification AFTER database commit
      try {
        await emailService.sendPasswordChangedNotification?.(user);
      } catch (emailError) {
        logger.warn('Failed to send password changed notification:', emailError);
      }

      return res.status(200).json({
        success: true,
        message: 'Password reset successful. Please log in with your new password.',
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Reset password error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Password reset failed. Please try again.',
        },
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
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
          error: {
            type: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      logger.error('Get profile error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to get profile. Please try again.',
        },
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'All password fields are required',
          },
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'New password and confirmation do not match',
          },
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'INVALID_PASSWORD',
            message: 'Current password is incorrect',
          },
        });
      }

      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'New password must be different from current password',
          },
        });
      }

      // Check password history (prevent reuse of last 3 passwords)
      const isInHistory = await user.isPasswordInHistory(newPassword);
      if (isInHistory) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'PASSWORD_IN_HISTORY',
            message:
              'You cannot reuse one of your last 3 passwords. Please choose a different password.',
          },
        });
      }

      user.passwordHash = newPassword;
      await user.save();

      // Expire all user sessions after password change
      try {
        await Session.expireAllUserSessions(user.id);
      } catch (sessionError) {
        logger.warn('Failed to expire sessions after password change:', sessionError);
        // Continue anyway - password was changed successfully
      }

      logger.info(`Password changed for user: ${user.username} (${user.email})`);

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please log in again.',
      });
    } catch (error) {
      logger.error('Change password error:', error);
      logger.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid password format',
          },
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to change password. Please try again.',
        },
      });
    }
  }

  // Parse user agent to extract device info
  static parseUserAgent(userAgent) {
    if (!userAgent) {
      return {
        deviceType: 'desktop',
        browser: 'Unknown',
        os: 'Unknown',
      };
    }

    const ua = userAgent.toLowerCase();
    let deviceType = 'desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect device type
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }

    // Detect browser
    if (ua.includes('edg/')) {
      browser = 'Edge';
    } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
      browser = 'Chrome';
    } else if (ua.includes('firefox/')) {
      browser = 'Firefox';
    } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
      browser = 'Safari';
    } else if (ua.includes('opera/') || ua.includes('opr/')) {
      browser = 'Opera';
    }

    // Detect OS
    if (ua.includes('windows')) {
      os = 'Windows';
    } else if (ua.includes('mac os')) {
      os = 'macOS';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    } else if (ua.includes('android')) {
      os = 'Android';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
    }

    return { deviceType, browser, os };
  }

  // Get all active sessions for the current user
  async getSessions(req, res) {
    try {
      const userId = req.user.id;
      const currentToken = req.headers.authorization?.replace('Bearer ', '');

      const sessions = await Session.findValidSessionsByUserId(userId);

      const formattedSessions = sessions.map(session => {
        // Extract userAgent from deviceInfo JSONB, fallback to req userAgent if null
        const userAgent =
          session.deviceInfo?.userAgent || session.userAgent || req.get('User-Agent') || '';
        const { deviceType, browser, os } = AuthController.parseUserAgent(userAgent);

        // Log for debugging if all values are "Unknown"
        if (browser === 'Unknown' && os === 'Unknown') {
          logger.debug('Session with unknown device info:', {
            sessionId: session.id,
            deviceInfo: session.deviceInfo,
            userAgent: userAgent.substring(0, 50),
          });
        }

        return {
          id: session.id,
          deviceType,
          browser,
          os,
          ip: session.ipAddress || 'Unknown',
          location: 'Unknown', // Could integrate with IP geolocation service
          lastActivity: session.createdAt, // Use createdAt since lastAccessedAt doesn't exist
          isCurrent: session.refreshToken === currentToken,
        };
      });

      return res.status(200).json({
        success: true,
        message: 'Sessions retrieved successfully',
        data: {
          sessions: formattedSessions,
        },
      });
    } catch (error) {
      logger.error('Get sessions error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to retrieve sessions. Please try again.',
        },
      });
    }
  }

  // Revoke a specific session
  async revokeSession(req, res) {
    try {
      const userId = req.user.id;
      const sessionId = req.params.sessionId;
      const currentToken = req.headers.authorization?.replace('Bearer ', '');

      // Find the session
      const session = await Session.findOne({
        where: {
          id: sessionId,
          userId,
        },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'SESSION_NOT_FOUND',
            message: 'Session not found',
          },
        });
      }

      // Prevent revoking current session
      if (session.token === currentToken) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'INVALID_OPERATION',
            message: 'Cannot revoke current session. Use logout instead.',
          },
        });
      }

      // Expire the session
      session.expiresAt = new Date();
      await session.save();

      // Remove from Redis
      await AuthController.removeSessionFromRedis(session.token);

      logger.info(`Session revoked for user ${userId}: ${sessionId}`);

      return res.status(200).json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      logger.error('Revoke session error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to revoke session. Please try again.',
        },
      });
    }
  }

  // Revoke all other sessions (keep current)
  async revokeAllOtherSessions(req, res) {
    try {
      const userId = req.user.id;
      const currentToken = req.headers.authorization?.replace('Bearer ', '');

      // Get all sessions for the user
      const sessions = await Session.findValidSessionsByUserId(userId);

      // Expire all sessions except current
      let revokedCount = 0;
      for (const session of sessions) {
        if (session.token !== currentToken) {
          session.expiresAt = new Date();
          await session.save();
          await AuthController.removeSessionFromRedis(session.token);
          revokedCount++;
        }
      }

      logger.info(`Revoked ${revokedCount} sessions for user ${userId}`);

      return res.status(200).json({
        success: true,
        message: `${revokedCount} session${revokedCount !== 1 ? 's' : ''} revoked successfully`,
        data: {
          revokedCount,
        },
      });
    } catch (error) {
      logger.error('Revoke all sessions error:', error);

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to revoke sessions. Please try again.',
        },
      });
    }
  }

  static async storeSessionInRedis(session) {
    try {
      const redis = getRedisClient();
      const sessionKey = `session:${session.token}`;
      const sessionData = {
        id: session.id,
        userId: session.userId,
        token: session.token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      };

      // Store session with TTL matching expiration (7 days in seconds)
      const ttl = Math.floor((new Date(session.expiresAt) - new Date()) / 1000);
      await redis.setex(sessionKey, ttl, JSON.stringify(sessionData));

      logger.info(`Session stored in Redis for user: ${session.userId}`);
    } catch (error) {
      logger.error('Failed to store session in Redis:', error);
      // Don't throw - session is in DB, Redis is supplementary
    }
  }

  static async removeSessionFromRedis(token) {
    try {
      const redis = getRedisClient();
      const sessionKey = `session:${token}`;
      await redis.del(sessionKey);
      logger.info(`Session removed from Redis: ${token.substring(0, 10)}...`);
    } catch (error) {
      logger.error('Failed to remove session from Redis:', error);
      // Don't throw - session is removed from DB, Redis is supplementary
    }
  }
}

export default new AuthController();
