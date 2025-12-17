import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

export const DeviceToken = sequelize.define(
  'DeviceToken',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      validate: {
        notEmpty: {
          msg: 'User ID is required',
        },
      },
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Device token is required',
        },
      },
    },
    deviceType: {
      type: DataTypes.ENUM('web', 'android', 'ios'),
      allowNull: false,
      defaultValue: 'web',
    },
    deviceName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Device name or browser info',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether this device token is active and should receive notifications',
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time this token was used to send a notification',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'device_tokens',
    underscored: true, // Use snake_case to match database schema
    timestamps: true,
    paranoid: false, // No soft deletes - table doesn't have deleted_at column
    indexes: [
      {
        fields: ['userId'],
        name: 'idx_device_tokens_user_id',
      },
      {
        unique: true,
        fields: ['userId', 'token'],
        name: 'idx_device_tokens_user_token_unique',
      },
      {
        fields: ['isActive'],
        name: 'idx_device_tokens_is_active',
      },
      {
        fields: ['createdAt'],
        name: 'idx_device_tokens_created_at',
      },
    ],
  }
);

// Instance methods
DeviceToken.prototype.markAsUsed = async function () {
  this.lastUsedAt = new Date();
  await this.save();
};

DeviceToken.prototype.deactivate = async function () {
  this.isActive = false;
  await this.save();
};

// Static methods
DeviceToken.findByUserId = function (userId) {
  return this.findAll({
    where: {
      userId,
      isActive: true,
    },
    order: [['created_at', 'DESC']],
  });
};

DeviceToken.findByUserIdAndToken = function (userId, token) {
  return this.findOne({
    where: {
      userId,
      token,
    },
  });
};

DeviceToken.deactivateToken = async function (userId, token) {
  return this.update(
    { isActive: false },
    {
      where: {
        userId,
        token,
      },
    }
  );
};

DeviceToken.deactivateAllUserTokens = async function (userId) {
  return this.update(
    { isActive: false },
    {
      where: {
        userId,
      },
    }
  );
};

export default DeviceToken;
