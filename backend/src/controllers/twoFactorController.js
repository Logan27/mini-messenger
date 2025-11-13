import crypto from 'crypto';

import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

import { User } from '../models/index.js';
import auditService from '../services/auditService.js';
import logger from '../utils/logger.js';

class TwoFactorController {
  /**
   * Generate 2FA secret and QR code for setup
   * POST /api/auth/2fa/setup
   */
  async setup(req, res) {
    try {
      const userId = req.user.id;
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

      if (user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          error: {
            type: '2FA_ALREADY_ENABLED',
            message: 'Two-factor authentication is already enabled',
          },
        });
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Messenger (${user.username})`,
        issuer: 'Messenger',
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Generate backup codes (10 codes)
      const backupCodes = [];
      for (let i = 0; i < 10; i++) {
        backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
      }

      // Hash backup codes before storing
      const hashedBackupCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 10)));

      // Store secret temporarily (not enabled yet until verified)
      user.twoFactorSecret = secret.base32;
      user.twoFactorBackupCodes = JSON.stringify(hashedBackupCodes);
      await user.save();

      await auditService.log({
        action: '2fa:setup_initiated',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          username: user.username,
        },
      });

      logger.info(`2FA setup initiated for user ${user.username}`);

      return res.status(200).json({
        success: true,
        data: {
          secret: secret.base32,
          qrCode: qrCodeUrl,
          backupCodes: backupCodes, // Send plain backup codes once
          manualEntryKey: secret.base32,
        },
      });
    } catch (error) {
      logger.error('2FA setup error:', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to setup two-factor authentication',
        },
      });
    }
  }

  /**
   * Verify TOTP code and enable 2FA
   * POST /api/auth/2fa/verify
   */
  async verify(req, res) {
    try {
      const userId = req.user.id;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'TOTP token is required',
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

      if (user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          error: {
            type: '2FA_ALREADY_ENABLED',
            message: 'Two-factor authentication is already enabled',
          },
        });
      }

      if (!user.twoFactorSecret) {
        return res.status(400).json({
          success: false,
          error: {
            type: '2FA_NOT_SETUP',
            message: 'Two-factor authentication has not been set up. Please call /setup first',
          },
        });
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2, // Allow 2 time steps before and after for clock drift
      });

      if (!verified) {
        await auditService.log({
          action: '2fa:verification_failed',
          userId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            username: user.username,
            reason: 'Invalid TOTP token',
          },
        });

        return res.status(400).json({
          success: false,
          error: {
            type: 'INVALID_TOKEN',
            message: 'Invalid authentication code. Please try again',
          },
        });
      }

      // Enable 2FA
      user.twoFactorEnabled = true;
      await user.save();

      await auditService.log({
        action: '2fa:enabled',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          username: user.username,
        },
      });

      logger.info(`2FA enabled for user ${user.username}`);

      return res.status(200).json({
        success: true,
        message: 'Two-factor authentication enabled successfully',
        data: {
          twoFactorEnabled: true,
        },
      });
    } catch (error) {
      logger.error('2FA verification error:', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to verify authentication code',
        },
      });
    }
  }

  /**
   * Disable 2FA with password and current token verification
   * POST /api/auth/2fa/disable
   */
  async disable(req, res) {
    try {
      const userId = req.user.id;
      const { password, token } = req.body;

      if (!password || !token) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Password and authentication code are required',
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

      if (!user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          error: {
            type: '2FA_NOT_ENABLED',
            message: 'Two-factor authentication is not enabled',
          },
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await auditService.log({
          action: '2fa:disable_failed',
          userId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            username: user.username,
            reason: 'Invalid password',
          },
        });

        return res.status(401).json({
          success: false,
          error: {
            type: 'INVALID_PASSWORD',
            message: 'Invalid password',
          },
        });
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2,
      });

      if (!verified) {
        // Check if it's a backup code
        const isBackupCodeValid = await this.verifyBackupCode(user, token);

        if (!isBackupCodeValid) {
          await auditService.log({
            action: '2fa:disable_failed',
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
              username: user.username,
              reason: 'Invalid TOTP token',
            },
          });

          return res.status(400).json({
            success: false,
            error: {
              type: 'INVALID_TOKEN',
              message: 'Invalid authentication code',
            },
          });
        }
      }

      // Disable 2FA
      user.twoFactorEnabled = false;
      user.twoFactorSecret = null;
      user.twoFactorBackupCodes = null;
      await user.save();

      await auditService.log({
        action: '2fa:disabled',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          username: user.username,
        },
      });

      logger.info(`2FA disabled for user ${user.username}`);

      return res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled successfully',
        data: {
          twoFactorEnabled: false,
        },
      });
    } catch (error) {
      logger.error('2FA disable error:', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to disable two-factor authentication',
        },
      });
    }
  }

  /**
   * Regenerate backup codes
   * POST /api/auth/2fa/regenerate-backup-codes
   */
  async regenerateBackupCodes(req, res) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Password is required',
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

      if (!user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          error: {
            type: '2FA_NOT_ENABLED',
            message: 'Two-factor authentication is not enabled',
          },
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'INVALID_PASSWORD',
            message: 'Invalid password',
          },
        });
      }

      // Generate new backup codes
      const backupCodes = [];
      for (let i = 0; i < 10; i++) {
        backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
      }

      // Hash backup codes
      const hashedBackupCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 10)));

      user.twoFactorBackupCodes = JSON.stringify(hashedBackupCodes);
      await user.save();

      await auditService.log({
        action: '2fa:backup_codes_regenerated',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          username: user.username,
        },
      });

      logger.info(`Backup codes regenerated for user ${user.username}`);

      return res.status(200).json({
        success: true,
        message: 'Backup codes regenerated successfully',
        data: {
          backupCodes: backupCodes,
        },
      });
    } catch (error) {
      logger.error('Backup codes regeneration error:', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to regenerate backup codes',
        },
      });
    }
  }

  /**
   * Get 2FA status
   * GET /api/auth/2fa/status
   */
  async getStatus(req, res) {
    try {
      const userId = req.user.id;
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

      return res.status(200).json({
        success: true,
        data: {
          twoFactorEnabled: user.twoFactorEnabled,
          hasBackupCodes: !!user.twoFactorBackupCodes,
        },
      });
    } catch (error) {
      logger.error('2FA status error:', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to get 2FA status',
        },
      });
    }
  }

  /**
   * Validate TOTP token or backup code (used during login)
   * POST /api/auth/2fa/validate
   */
  async validate(req, res) {
    try {
      const { username, token } = req.body;

      if (!username || !token) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Username and token are required',
          },
        });
      }

      const user = await User.findOne({ where: { username } });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          error: {
            type: '2FA_NOT_ENABLED',
            message: 'Two-factor authentication is not enabled for this user',
          },
        });
      }

      // Try TOTP verification first
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2,
      });

      if (verified) {
        return res.status(200).json({
          success: true,
          data: {
            valid: true,
            method: 'totp',
          },
        });
      }

      // Try backup code verification
      const isBackupCodeValid = await this.verifyBackupCode(user, token);

      if (isBackupCodeValid) {
        await user.save(); // Save to remove used backup code

        return res.status(200).json({
          success: true,
          data: {
            valid: true,
            method: 'backup_code',
          },
        });
      }

      await auditService.log({
        action: '2fa:validation_failed',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          username: user.username,
        },
      });

      return res.status(400).json({
        success: false,
        error: {
          type: 'INVALID_TOKEN',
          message: 'Invalid authentication code',
        },
      });
    } catch (error) {
      logger.error('2FA validation error:', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to validate authentication code',
        },
      });
    }
  }

  /**
   * Helper method to verify backup code
   * @private
   */
  async verifyBackupCode(user, code) {
    if (!user.twoFactorBackupCodes) {
      return false;
    }

    try {
      const backupCodes = JSON.parse(user.twoFactorBackupCodes);

      for (let i = 0; i < backupCodes.length; i++) {
        const isMatch = await bcrypt.compare(code, backupCodes[i]);
        if (isMatch) {
          // Remove used backup code
          backupCodes.splice(i, 1);
          user.twoFactorBackupCodes = JSON.stringify(backupCodes);
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Backup code verification error:', error);
      return false;
    }
  }
}

export default new TwoFactorController();
