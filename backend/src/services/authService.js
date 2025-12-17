import crypto from 'crypto';

import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';
import { getRedisClient } from '../config/redis.js';
import { User, Session, PasswordHistory } from '../models/index.js';
import {
  UnauthorizedError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from '../utils/errors.js';
import { generateTokens, hashPassword, comparePassword } from '../utils/jwt.js';
import logger from '../utils/logger.js';

import auditService from './auditService.js';
import emailService from './emailService.js';

/**
 * Authentication service
 * Handles all authentication-related business logic
 */
class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email address
   * @param {string} userData.password - Password
   * @param {string} userData.firstName - First name (optional)
   * @param {string} userData.lastName - Last name (optional)
   * @param {string} userData.avatar - Avatar URL (optional)
   * @returns {Object} Created user and success message
   */
  async registerUser(userData) {
    const transaction = await sequelize.transaction();

    try {
      const { username, email, password, firstName, lastName, avatar } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ username }, { email }],
        },
        transaction,
      });

      if (existingUser) {
        throw new ConflictError(
          existingUser.username === username
            ? 'Username is already taken'
            : 'Email is already registered'
        );
      }

      // Determine if email should be auto-verified
      const autoVerifyEmail =
        process.env.AUTO_VERIFY_EMAIL === 'true' || process.env.NODE_ENV !== 'production';
      const emailVerified = autoVerifyEmail;
      const emailVerificationToken = autoVerifyEmail ? null : uuidv4().replace(/-/g, '');

      // Create user
      const user = await User.create(
        {
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
        },
        { transaction }
      );

      await transaction.commit();

      // Send welcome email (async, non-blocking)
      if (!autoVerifyEmail) {
        this.sendWelcomeEmails(user).catch(err => {
          logger.error('Failed to send welcome emails:', err);
        });
      }

      const successMessage = autoVerifyEmail
        ? 'Registration successful. Your email has been automatically verified.'
        : 'Registration successful. Please check your email to verify your account.';

      return {
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
        message: successMessage,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Send welcome emails asynchronously
   * @param {Object} user - User object
   */
  async sendWelcomeEmails(user) {
    try {
      await emailService.sendWelcomeEmail(user);
      await emailService.sendAdminNotification(user);
      logger.info(`Welcome email sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      // Don't throw - email failures shouldn't block registration
    }
  }

  /**
   * Authenticate user and create session
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.identifier - Username or email
   * @param {string} credentials.password - Password
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Object} User, tokens, and session
   */
  async login(credentials, ipAddress, userAgent) {
    const { identifier, password } = credentials;

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
        ipAddress,
        userAgent,
        severity: 'medium',
        status: 'failure',
        errorMessage: 'Invalid credentials',
      });

      throw new UnauthorizedError('Invalid username/email or password');
    }

    // Check if account is locked
    if (typeof user.isLocked === 'function' && user.isLocked()) {
      const remainingTime = Math.ceil((user.lockedUntil - new Date()) / (1000 * 60));
      throw new UnauthorizedError(
        `Account is locked. Please try again in ${remainingTime} minutes.`
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      await user.incrementFailedLogins();

      await auditService.logAuthEvent({
        userId: user.id,
        action: 'user_login_failed',
        details: {
          identifier: identifier,
          reason: 'invalid_password',
          failedAttempts: user.failedLoginAttempts,
        },
        ipAddress,
        userAgent,
        severity: 'medium',
        status: 'failure',
        errorMessage: 'Invalid credentials',
      });

      throw new UnauthorizedError('Invalid username/email or password');
    }

    // Check email verification
    const autoVerifyEmail =
      process.env.AUTO_VERIFY_EMAIL === 'true' || process.env.NODE_ENV !== 'production';

    if (!autoVerifyEmail && !user.emailVerified) {
      throw new UnauthorizedError(
        'Please verify your email address before logging in. Check your email for the verification link.'
      );
    }

    // Check if 2FA is required
    if (user.twoFactorEnabled) {
      return {
        requiresTwoFactor: true,
        userId: user.id,
        message: 'Two-factor authentication required',
      };
    }

    // Create session
    return await this.createSession(user, ipAddress, userAgent);
  }

  /**
   * Create session for authenticated user
   * @param {Object} user - User object
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Object} User, tokens, and session
   */
  async createSession(user, ipAddress, userAgent) {
    const transaction = await sequelize.transaction();

    try {
      // Reset failed login attempts
      if (user.failedLoginAttempts > 0) {
        await user.resetFailedLogins({ transaction });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Create session record
      const session = await Session.create(
        {
          userId: user.id,
          token: refreshToken,
          ipAddress,
          userAgent,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          lastActivity: new Date(),
        },
        { transaction }
      );

      // Update user's last login
      await user.update(
        {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
        },
        { transaction }
      );

      // Cache user session in Redis
      const redis = getRedisClient();
      await redis.setex(
        `session:${session.id}`,
        30 * 24 * 60 * 60, // 30 days
        JSON.stringify({
          userId: user.id,
          sessionId: session.id,
          createdAt: session.createdAt,
        })
      );

      await transaction.commit();

      // Log successful login
      await auditService.logAuthEvent({
        userId: user.id,
        action: 'user_login',
        details: {
          sessionId: session.id,
        },
        ipAddress,
        userAgent,
        severity: 'low',
        status: 'success',
      });

      logger.info(`User ${user.username} logged in successfully`);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          role: user.role,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        },
        accessToken,
        refreshToken,
        sessionId: session.id,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Logout user and invalidate session
   * @param {number} userId - User ID
   * @param {string} refreshToken - Refresh token
   */
  async logout(userId, refreshToken) {
    const transaction = await sequelize.transaction();

    try {
      // Find and delete session
      const session = await Session.findOne({
        where: {
          userId,
          token: refreshToken,
        },
        transaction,
      });

      if (session) {
        await session.destroy({ transaction });

        // Remove from Redis cache
        const redis = getRedisClient();
        await redis.del(`session:${session.id}`);

        // Log logout
        await auditService.logAuthEvent({
          userId,
          action: 'user_logout',
          details: {
            sessionId: session.id,
          },
          severity: 'low',
          status: 'success',
        });
      }

      await transaction.commit();
      logger.info(`User ${userId} logged out successfully`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Initiate password reset
   * @param {string} email - User email
   * @param {string} ipAddress - Client IP address
   */
  async forgotPassword(email, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const user = await User.findOne({
        where: { email },
        transaction,
      });

      if (!user) {
        // Don't reveal if email exists
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return {
          message: 'If an account with that email exists, a password reset link has been sent.',
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Save hashed token to user
      await user.update(
        {
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
        { transaction }
      );

      await transaction.commit();

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(user, resetToken);
        logger.info(`Password reset email sent to ${email}`);
      } catch (emailError) {
        logger.error('Failed to send password reset email:', emailError);
      }

      // Log password reset request
      await auditService.logAuthEvent({
        userId: user.id,
        action: 'password_reset_requested',
        details: { email },
        ipAddress,
        severity: 'medium',
        status: 'success',
      });

      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @param {string} ipAddress - Client IP address
   */
  async resetPassword(token, newPassword, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      // Hash the token to compare with stored hash
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid reset token
      const user = await User.findOne({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpires: { [Op.gt]: new Date() },
        },
        transaction,
      });

      if (!user) {
        throw new ValidationError('Invalid or expired password reset token');
      }

      // Check password history to prevent reuse
      const passwordHistory = await PasswordHistory.findAll({
        where: { userId: user.id },
        order: [['created_at', 'DESC']],
        limit: 3,
        transaction,
      });

      for (const history of passwordHistory) {
        const isSamePassword = await comparePassword(newPassword, history.passwordHash);
        if (isSamePassword) {
          throw new ValidationError(
            'You cannot reuse any of your last 3 passwords. Please choose a different password.'
          );
        }
      }

      // Update password
      const hashedPassword = await hashPassword(newPassword);
      await user.update(
        {
          passwordHash: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          passwordChangedAt: new Date(),
        },
        { transaction }
      );

      // Save to password history
      await PasswordHistory.create(
        {
          userId: user.id,
          passwordHash: hashedPassword,
        },
        { transaction }
      );

      // Invalidate all existing sessions
      await Session.destroy({
        where: { userId: user.id },
        transaction,
      });

      await transaction.commit();

      // Log password reset
      await auditService.logAuthEvent({
        userId: user.id,
        action: 'password_reset_completed',
        details: {},
        ipAddress,
        severity: 'high',
        status: 'success',
      });

      logger.info(`Password reset completed for user ${user.id}`);

      return {
        message: 'Password has been reset successfully. Please log in with your new password.',
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Verify email with token
   * @param {string} token - Verification token
   */
  async verifyEmail(token) {
    const transaction = await sequelize.transaction();

    try {
      const user = await User.findOne({
        where: {
          emailVerificationToken: token,
          emailVerified: false,
        },
        transaction,
      });

      if (!user) {
        throw new ValidationError('Invalid or expired verification token');
      }

      // Mark email as verified
      await user.update(
        {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerifiedAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Log email verification
      await auditService.logAuthEvent({
        userId: user.id,
        action: 'email_verified',
        details: {},
        severity: 'low',
        status: 'success',
      });

      logger.info(`Email verified for user ${user.id}`);

      return {
        message: 'Email verified successfully. You can now log in.',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Resend email verification
   * @param {string} email - User email
   */
  async resendVerification(email) {
    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return {
        message:
          'If an account with that email exists and is not verified, a verification email has been sent.',
      };
    }

    if (user.emailVerified) {
      return {
        message: 'This email address is already verified.',
      };
    }

    // Generate new token if needed
    if (!user.emailVerificationToken) {
      const newToken = uuidv4().replace(/-/g, '');
      await user.update({
        emailVerificationToken: newToken,
      });
    }

    // Send verification email
    try {
      await emailService.sendWelcomeEmail(user);
      logger.info(`Verification email resent to ${email}`);
    } catch (emailError) {
      logger.error('Failed to resend verification email:', emailError);
    }

    return {
      message:
        'If an account with that email exists and is not verified, a verification email has been sent.',
    };
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New access token
   */
  async refreshAccessToken(refreshToken) {
    // Find session with refresh token
    const session = await Session.findOne({
      where: {
        token: refreshToken,
        expiresAt: { [Op.gt]: new Date() },
      },
      include: [{ model: User, as: 'user' }],
    });

    if (!session) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Update last activity
    await session.update({
      lastActivity: new Date(),
    });

    // Generate new access token
    const { accessToken } = generateTokens(session.user);

    return {
      accessToken,
      user: {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role,
      },
    };
  }
}

export default new AuthService();
