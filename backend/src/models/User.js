import crypto from 'crypto';

import bcrypt from 'bcryptjs';
import { DataTypes, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';
import logger from '../utils/logger.js';

import PasswordHistory from './PasswordHistory.js';

export const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: 'unique_username',
        msg: 'Username already exists',
      },
      validate: {
        notEmpty: {
          msg: 'Username is required',
        },
        len: {
          args: [3, 50],
          msg: 'Username must be between 3 and 50 characters',
        },
        isAlphanumeric: {
          msg: 'Username can only contain letters and numbers',
        },
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: {
        name: 'unique_email',
        msg: 'Email already exists',
      },
      validate: {
        notEmpty: {
          msg: 'Email is required',
        },
        isEmail: {
          msg: 'Please provide a valid email address',
        },
        len: {
          args: [0, 255],
          msg: 'Email must be less than 255 characters',
        },
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Password is required',
        },
      },
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'First name must be less than 100 characters',
        },
      },
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Last name must be less than 100 characters',
        },
      },
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrlOrPath(value) {
          if (value && !value.startsWith('/') && !value.startsWith('http')) {
            throw new Error('Avatar must be a valid URL or path');
          }
        },
      },
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Bio must be less than 500 characters',
        },
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^\+?[1-9]\d{1,14}$/,
          msg: 'Phone must be a valid E.164 format',
        },
      },
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'away', 'busy'),
      defaultValue: 'offline',
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'moderator'),
      defaultValue: 'user',
      allowNull: false,
    },
    approvalStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'approved', // TODO: Change to 'pending' when admin approval flow is fully implemented
      allowNull: false,
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: {
        name: 'unique_email_verification_token',
        msg: 'Email verification token already exists',
      },
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: {
        name: 'unique_password_reset_token',
        msg: 'Password reset token already exists',
      },
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0, // Simple format: allows >= 0
        max: 10, // Simple format: allows <= 10
      },
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    publicKey: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64-encoded public key for E2E encryption (libsodium)',
    },
    readReceiptsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Privacy setting: whether to send read receipts to other users',
    },
    termsAcceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when user accepted Terms of Service',
    },
    privacyAcceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when user accepted Privacy Policy',
    },
    termsVersion: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '1.0',
      comment: 'Version of Terms of Service accepted by user',
    },
    privacyVersion: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '1.0',
      comment: 'Version of Privacy Policy accepted by user',
    },
    twoFactorSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Base32-encoded secret for TOTP two-factor authentication',
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether two-factor authentication is enabled',
    },
    twoFactorBackupCodes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of hashed backup codes for 2FA recovery',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['username'],
        name: 'idx_users_username_unique',
      },
      {
        unique: true,
        fields: ['email'],
        name: 'idx_users_email_unique',
      },
      {
        fields: ['status'],
        name: 'idx_users_status',
      },
      {
        fields: ['emailVerified'],
        name: 'idx_users_email_verified',
      },
      {
        fields: ['createdAt'],
        name: 'idx_users_created_at',
      },
      {
        fields: ['lastLoginAt'],
        name: 'idx_users_last_login_at',
      },
      {
        fields: ['role'],
        name: 'idx_users_role',
      },
      {
        fields: ['approvalStatus'],
        name: 'idx_users_approval_status',
      },
      {
        fields: ['readReceiptsEnabled'],
        name: 'idx_users_read_receipts_enabled',
      },
    ],
    timestamps: true,
    paranoid: true,
  }
);

// Instance methods
User.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

User.prototype.isLocked = function () {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
};

User.prototype.incrementFailedAttempts = async function () {
  this.failedLoginAttempts += 1;

  // Lock account after 5 failed attempts for 2 hours
  if (this.failedLoginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  }

  await this.save();
};

User.prototype.resetFailedAttempts = async function () {
  this.failedLoginAttempts = 0;
  this.lockedUntil = null;
  await this.save();
};

User.prototype.isPasswordInHistory = async function (password) {
  const { default: bcrypt } = await import('bcryptjs');
  const passwords = await PasswordHistory.findAll({
    where: { userId: this.id },
    order: [['createdAt', 'DESC']],
    limit: 3,
  });

  for (const passwordRecord of passwords) {
    const isSamePassword = await bcrypt.compare(password, passwordRecord.passwordHash);
    if (isSamePassword) {
      return true; // Password found in history
    }
  }

  return false; // Password not in history
};

User.prototype.generateEmailVerificationToken = function () {
  this.emailVerificationToken = uuidv4().replace(/-/g, '');
  return this.emailVerificationToken;
};

User.prototype.generatePasswordResetToken = function () {
  // Use dynamic import for crypto in ES modules
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return resetToken;
};

// Static methods
User.hashPassword = async function (password) {
  const { config } = await import('../config/index.js');
  return await bcrypt.hash(password, config.security.bcryptRounds);
};

User.findByEmailOrUsername = function (identifier) {
  return this.findOne({
    where: {
      [Op.or]: [{ email: identifier }, { username: identifier }],
    },
  });
};

// Hooks
User.beforeCreate(async user => {
  if (user.changed('passwordHash')) {
    user.passwordHash = await User.hashPassword(user.passwordHash);
  }
});

User.beforeUpdate(async user => {
  if (user.changed('passwordHash')) {
    const newPasswordHash = await User.hashPassword(user.passwordHash);

    // Add current password to history if this is not a new user
    if (user._previousDataValues && user._previousDataValues.passwordHash) {
      try {
        await PasswordHistory.addPasswordToHistory(user.id, user._previousDataValues.passwordHash);
      } catch (historyError) {
        // Log error but don't fail password change if history fails
        logger.error('Failed to add password to history:', historyError.message);
      }
    }

    user.passwordHash = newPasswordHash;
  }
});

export default User;
