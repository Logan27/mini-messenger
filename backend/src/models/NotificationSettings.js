import { DataTypes, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

import User from './User.js';

export const NotificationSettings = sequelize.define(
  'NotificationSettings',
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
      validate: {
        notEmpty: {
          msg: 'User ID is required',
        },
      },
    },
    inAppEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      validate: {
        isBoolean: {
          msg: 'In-app notifications enabled must be a boolean',
        },
      },
    },
    emailEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      validate: {
        isBoolean: {
          msg: 'Email notifications enabled must be a boolean',
        },
      },
    },
    pushEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      validate: {
        isBoolean: {
          msg: 'Push notifications enabled must be a boolean',
        },
      },
    },
    quietHoursStart: {
      type: DataTypes.TIME,
      allowNull: true,
      validate: {
        isValidTime(value) {
          if (value && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
            throw new Error('Quiet hours start must be in HH:MM format');
          }
        },
      },
    },
    quietHoursEnd: {
      type: DataTypes.TIME,
      allowNull: true,
      validate: {
        isValidTime(value) {
          if (value && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
            throw new Error('Quiet hours end must be in HH:MM format');
          }
        },
      },
    },
    doNotDisturb: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      validate: {
        isBoolean: {
          msg: 'Do not disturb must be a boolean',
        },
      },
    },
    messageNotifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      validate: {
        isBoolean: {
          msg: 'Message notifications must be a boolean',
        },
      },
    },
    callNotifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      validate: {
        isBoolean: {
          msg: 'Call notifications must be a boolean',
        },
      },
    },
    mentionNotifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      validate: {
        isBoolean: {
          msg: 'Mention notifications must be a boolean',
        },
      },
    },
    adminNotifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      validate: {
        isBoolean: {
          msg: 'Admin notifications must be a boolean',
        },
      },
    },
    systemNotifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      validate: {
        isBoolean: {
          msg: 'System notifications must be a boolean',
        },
      },
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
    tableName: 'notificationSettings',
    underscored: false, // Table uses camelCase columns
    timestamps: true,
    paranoid: false, // Explicitly disable soft deletes
    indexes: [
      {
        unique: true,
        fields: ['userId'],
        name: 'idx_notification_settings_user_id_unique',
      },
      {
        fields: ['inAppEnabled'],
        name: 'idx_notification_settings_in_app_enabled',
      },
      {
        fields: ['emailEnabled'],
        name: 'idx_notification_settings_email_enabled',
      },
      {
        fields: ['pushEnabled'],
        name: 'idx_notification_settings_push_enabled',
      },
      {
        fields: ['doNotDisturb'],
        name: 'idx_notification_settings_dnd',
      },
      {
        fields: ['quietHoursStart', 'quietHoursEnd'],
        name: 'idx_notification_settings_quiet_hours',
      },
      {
        fields: ['updatedAt'],
        name: 'idx_notification_settings_updated_at',
      },
    ],
  }
);

// Define associations
NotificationSettings.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE',
});

User.hasOne(NotificationSettings, {
  foreignKey: 'userId',
  as: 'notificationSettings',
});

// Instance methods
NotificationSettings.prototype.isInQuietHours = function () {
  if (!this.quietHoursStart || !this.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  const startTime = this.timeToMinutes(this.quietHoursStart);
  const endTime = this.timeToMinutes(this.quietHoursEnd);

  if (startTime <= endTime) {
    // Same day quiet hours (e.g., 09:00 to 17:00)
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Overnight quiet hours (e.g., 22:00 to 08:00)
    return currentTime >= startTime || currentTime <= endTime;
  }
};

NotificationSettings.prototype.shouldReceiveNotification = function (
  notificationType,
  channel = 'inApp'
) {
  // Check if DND is enabled
  if (this.doNotDisturb) {
    return false;
  }

  // Check if in quiet hours
  if (this.isInQuietHours()) {
    return false;
  }

  // Check channel-specific settings
  switch (channel) {
    case 'inApp':
      if (!this.inAppEnabled) {
        return false;
      }
      break;
    case 'email':
      if (!this.emailEnabled) {
        return false;
      }
      break;
    case 'push':
      if (!this.pushEnabled) {
        return false;
      }
      break;
    default:
      return false;
  }

  // Check notification type settings
  switch (notificationType) {
    case 'message':
      return this.messageNotifications;
    case 'call':
      return this.callNotifications;
    case 'mention':
      return this.mentionNotifications;
    case 'admin':
      return this.adminNotifications;
    case 'system':
      return this.systemNotifications;
    default:
      return false;
  }
};

NotificationSettings.prototype.timeToMinutes = function (timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 100 + minutes;
};

NotificationSettings.prototype.validateQuietHours = function () {
  if (!this.quietHoursStart && !this.quietHoursEnd) {
    return { isValid: true };
  }

  if (!this.quietHoursStart || !this.quietHoursEnd) {
    return { isValid: false, error: 'Both quiet hours start and end must be set' };
  }

  const startMinutes = this.timeToMinutes(this.quietHoursStart);
  const endMinutes = this.timeToMinutes(this.quietHoursEnd);

  if (startMinutes === endMinutes) {
    return { isValid: false, error: 'Quiet hours start and end cannot be the same time' };
  }

  return { isValid: true };
};

// Static methods
NotificationSettings.findByUserId = function (userId) {
  return this.findOne({
    where: { userId },
  });
};

NotificationSettings.createDefaultSettings = async function (userId) {
  return await this.create({
    userId,
    inAppEnabled: true,
    emailEnabled: true,
    pushEnabled: true,
    doNotDisturb: false,
    messageNotifications: true,
    callNotifications: true,
    mentionNotifications: true,
    adminNotifications: true,
    systemNotifications: true,
  });
};

NotificationSettings.getOrCreateDefault = async function (userId) {
  let settings = await this.findByUserId(userId);

  if (!settings) {
    settings = await this.createDefaultSettings(userId);
  }

  return settings;
};

NotificationSettings.resetToDefaults = async function (userId) {
  const settings = await this.findByUserId(userId);

  if (!settings) {
    return await this.createDefaultSettings(userId);
  }

  // Reset to defaults
  settings.inAppEnabled = true;
  settings.emailEnabled = true;
  settings.pushEnabled = true;
  settings.quietHoursStart = null;
  settings.quietHoursEnd = null;
  settings.doNotDisturb = false;
  settings.messageNotifications = true;
  settings.callNotifications = true;
  settings.mentionNotifications = true;
  settings.adminNotifications = true;
  settings.systemNotifications = true;
  settings.updatedAt = new Date();

  return await settings.save();
};

NotificationSettings.getSettingsForUsers = async function (userIds) {
  return await this.findAll({
    where: {
      userId: {
        [Op.in]: userIds,
      },
    },
  });
};

// Hooks
NotificationSettings.beforeCreate(async settings => {
  // Validate quiet hours if set
  const quietHoursValidation = settings.validateQuietHours();
  if (!quietHoursValidation.isValid) {
    throw new Error(quietHoursValidation.error);
  }
});

NotificationSettings.beforeUpdate(async settings => {
  settings.updatedAt = new Date();

  // Validate quiet hours if set
  const quietHoursValidation = settings.validateQuietHours();
  if (!quietHoursValidation.isValid) {
    throw new Error(quietHoursValidation.error);
  }
});

export default NotificationSettings;
