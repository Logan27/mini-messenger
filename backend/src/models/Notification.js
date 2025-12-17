import { DataTypes, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

export const Notification = sequelize.define(
  'Notification',
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
    type: {
      type: DataTypes.ENUM('message', 'call', 'admin', 'system'),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Notification type is required',
        },
        isIn: {
          args: [['message', 'call', 'admin', 'system']],
          msg: 'Invalid notification type',
        },
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Notification title is required',
        },
        len: {
          args: [1, 255],
          msg: 'Title must be between 1 and 255 characters',
        },
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Notification content is required',
        },
        len: {
          args: [1, 2000],
          msg: 'Content must be between 1 and 2000 characters',
        },
      },
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      validate: {
        isValidJson(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Data must be a valid JSON object');
          }
        },
      },
      comment: 'Additional data associated with the notification (e.g., messageId, callId, etc.)',
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal',
      allowNull: false,
      validate: {
        isIn: {
          args: [['low', 'normal', 'high', 'urgent']],
          msg: 'Invalid priority level',
        },
      },
    },
    category: {
      type: DataTypes.ENUM('general', 'message', 'group', 'call', 'system', 'admin'),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Notification category is required',
        },
        isIn: {
          args: [['general', 'message', 'group', 'call', 'system', 'admin']],
          msg: 'Invalid notification category',
        },
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      validate: {
        isAfter: {
          args: new Date().toISOString(),
          msg: 'Expiration date must be in the future',
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'notifications',
    underscored: true,
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['userId'],
        name: 'idx_notifications_user_id',
      },
      {
        fields: ['userId', 'read'],
        name: 'idx_notifications_user_read',
      },
      {
        fields: ['userId', 'createdAt'],
        name: 'idx_notifications_user_created',
      },
      {
        fields: ['type'],
        name: 'idx_notifications_type',
      },
      {
        fields: ['priority'],
        name: 'idx_notifications_priority',
      },
      {
        fields: ['category'],
        name: 'idx_notifications_category',
      },
      {
        fields: ['read', 'createdAt'],
        name: 'idx_notifications_read_created',
      },
      {
        fields: ['expiresAt'],
        name: 'idx_notifications_expires_at',
      },
      {
        unique: true,
        fields: ['id'],
        name: 'idx_notifications_id_unique',
      },
    ],
  }
);

// Instance methods
Notification.prototype.markAsRead = async function () {
  this.read = true;
  this.updatedAt = new Date();
  return await this.save();
};

Notification.prototype.markAsUnread = async function () {
  this.read = false;
  this.updatedAt = new Date();
  return await this.save();
};

Notification.prototype.isExpired = function () {
  return this.expiresAt && this.expiresAt < new Date();
};

// Static methods
Notification.createNotification = async function (notificationData) {
  const {
    userId,
    type,
    title,
    content,
    data = {},
    priority = 'normal',
    category,
    expiresAt,
    read,
  } = notificationData;

  // Validate required fields
  if (!userId || !type || !title || !content || !category) {
    throw new Error('Missing required notification fields');
  }

  // Set default expiration if not provided
  const expiryDate = expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return await this.create({
    userId,
    type,
    title,
    content,
    data,
    priority,
    category,
    expiresAt: expiryDate,
    ...(read !== undefined && { read }),
  });
};

Notification.findByUserId = function (userId, options = {}) {
  const {
    limit = 50,
    offset = 0,
    read,
    type,
    priority,
    category,
    includeExpired = false,
  } = options;

  const whereClause = { userId };

  // Add optional filters
  if (typeof read === 'boolean') {
    whereClause.read = read;
  }

  if (type) {
    whereClause.type = type;
  }

  if (priority) {
    whereClause.priority = priority;
  }

  if (category) {
    whereClause.category = category;
  }

  if (!includeExpired) {
    whereClause.expiresAt = {
      [Op.or]: [{ [Op.gt]: new Date() }, null],
    };
  }

  return this.findAll({
    where: whereClause,
    order: [
      [
        sequelize.literal(
          `CASE priority
            WHEN 'urgent' THEN 4
            WHEN 'high' THEN 3
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 1
            ELSE 0
          END`
        ),
        'DESC',
      ], // Higher priority first
      ['createdAt', 'DESC'], // Most recent first
    ],
    limit,
    offset,
  });
};

Notification.getUnreadCount = function (userId) {
  return this.count({
    where: {
      userId,
      read: false,
      expiresAt: {
        [Op.or]: [{ [Op.gt]: new Date() }, null],
      },
    },
  });
};

Notification.markAllAsRead = async function (userId, filters = {}) {
  const whereClause = {
    userId,
    read: false, // Only mark unread notifications
  };

  // Apply optional filters
  if (filters.type) {
    whereClause.type = filters.type;
  }

  if (filters.category) {
    whereClause.category = filters.category;
  }

  if (filters.priority) {
    whereClause.priority = filters.priority;
  }

  // Only mark non-expired notifications as read
  whereClause.expiresAt = {
    [Op.or]: [{ [Op.gt]: new Date() }, null],
  };

  const [affectedRows] = await this.update(
    {
      read: true,
      updatedAt: new Date(),
    },
    {
      where: whereClause,
    }
  );

  return affectedRows;
};

Notification.deleteExpired = async function () {
  const result = await this.destroy({
    where: {
      expiresAt: {
        [Op.lt]: new Date(),
      },
    },
  });

  return result;
};

Notification.findByIdAndUser = function (id, userId) {
  return this.findOne({
    where: {
      id,
      userId,
      expiresAt: {
        [Op.or]: [{ [Op.gt]: new Date() }, null],
      },
    },
  });
};

// Hooks
Notification.beforeCreate(notification => {
  // Ensure expiresAt is set if not provided
  if (!notification.expiresAt) {
    notification.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
});

Notification.beforeUpdate(notification => {
  notification.updatedAt = new Date();
});

export default Notification;
