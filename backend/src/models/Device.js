import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

/**
 * Device Model
 * Tracks user devices for session management and multi-device support
 */
export const Device = sequelize.define(
  'Device',
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
    deviceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: {
          args: [0, 50],
          msg: 'Device type must be less than 50 characters',
        },
      },
      comment: 'Type of device (e.g., mobile, desktop, tablet)',
    },
    deviceName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: {
          args: [0, 255],
          msg: 'Device name must be less than 255 characters',
        },
      },
      comment: 'User-friendly device name or browser info',
    },
    deviceToken: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Device token is required',
        },
      },
      comment: 'Unique token identifying this device',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether this device is currently active',
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time this device was active',
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
    tableName: 'devices',
    underscored: true, // Use snake_case to match database schema
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['deviceToken'],
        name: 'idx_devices_token_unique',
      },
      {
        fields: ['userId'],
        name: 'idx_devices_user_id',
      },
      {
        fields: ['isActive'],
        name: 'idx_devices_is_active',
      },
      {
        fields: ['userId', 'isActive'],
        name: 'idx_devices_user_active',
      },
      {
        fields: ['lastSeenAt'],
        name: 'idx_devices_last_seen',
      },
    ],
  }
);

// Instance methods
Device.prototype.updateLastSeen = async function () {
  this.lastSeenAt = new Date();
  await this.save();
};

Device.prototype.deactivate = async function () {
  this.isActive = false;
  await this.save();
};

Device.prototype.activate = async function () {
  this.isActive = true;
  this.lastSeenAt = new Date();
  await this.save();
};

// Static methods
Device.findByToken = function (token) {
  return this.findOne({
    where: { deviceToken: token },
  });
};

Device.findActiveByUserId = function (userId) {
  return this.findAll({
    where: {
      userId,
      isActive: true,
    },
    order: [['lastSeenAt', 'DESC']],
  });
};

Device.findByUserId = function (userId) {
  return this.findAll({
    where: { userId },
    order: [['lastSeenAt', 'DESC']],
  });
};

Device.deactivateDevice = async function (token) {
  return await this.update(
    { isActive: false },
    {
      where: { deviceToken: token },
    }
  );
};

Device.deactivateAllUserDevices = async function (userId) {
  return await this.update(
    { isActive: false },
    {
      where: { userId },
    }
  );
};

Device.cleanupInactiveDevices = async function (daysInactive = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  return await this.destroy({
    where: {
      isActive: false,
      lastSeenAt: {
        [sequelize.Sequelize.Op.lt]: cutoffDate,
      },
    },
  });
};

export default Device;
