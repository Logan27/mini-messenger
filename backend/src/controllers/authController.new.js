import authService from '../services/authService.js';
import logger from '../utils/logger.js';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
} from '../validators/authValidator.js';

/**
 * Authentication Controller
 * Handles HTTP request/response for authentication endpoints
 * Delegates business logic to authService
 */
class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      // Validate input
      const { error } = validateRegister(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.details.map(d => d.message).join(', '),
            details: error.details,
          },
        });
      }

      // Delegate to service
      const result = await authService.registerUser(req.body);

      return res.status(201).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
        },
      });
    } catch (error) {
      // Let error handler middleware handle it
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      // Validate input
      const { error } = validateLogin(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.details.map(d => d.message).join(', '),
            details: error.details,
          },
        });
      }

      // Get IP and user agent
      const ipAddress = req.ip || req.connection?.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Delegate to service
      const result = await authService.login(req.body, ipAddress, userAgent);

      // Check if 2FA is required
      if (result.requiresTwoFactor) {
        return res.status(200).json({
          success: true,
          requiresTwoFactor: true,
          userId: result.userId,
          message: result.message,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          sessionId: result.sessionId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const userId = req.user.id;
      const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

      await authService.logout(userId, refreshToken);

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot password
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      // Validate input
      const { error } = validateForgotPassword(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.details.map(d => d.message).join(', '),
          },
        });
      }

      const ipAddress = req.ip || req.connection?.remoteAddress;
      const result = await authService.forgotPassword(req.body.email, ipAddress);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      // Validate input
      const { error } = validateResetPassword(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.details.map(d => d.message).join(', '),
          },
        });
      }

      const ipAddress = req.ip || req.connection?.remoteAddress;
      const result = await authService.resetPassword(req.body.token, req.body.password, ipAddress);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email
   * GET /api/auth/verify-email
   */
  async verifyEmail(req, res, next) {
    try {
      // Validate input
      const { error } = validateVerifyEmail({ token: req.query.token });
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.details.map(d => d.message).join(', '),
          },
        });
      }

      const result = await authService.verifyEmail(req.query.token);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   */
  async resendVerification(req, res, next) {
    try {
      const result = await authService.resendVerification(req.body.email);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
          },
        });
      }

      const result = await authService.refreshAccessToken(refreshToken);

      return res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  async me(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            avatar: req.user.avatar,
            role: req.user.role,
            emailVerified: req.user.emailVerified,
            twoFactorEnabled: req.user.twoFactorEnabled,
            createdAt: req.user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
