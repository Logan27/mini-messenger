import { DataTypes, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

export const GroupMessageStatus = sequelize.define(
  'GroupMessageStatus',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
      allowNull: false,
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'messages',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'read'),
      defaultValue: 'sent',
      allowNull: false,
      validate: {
        isIn: {
          args: [['sent', 'delivered', 'read']],
          msg: 'Status must be sent, delivered, or read',
        },
      },
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'group_message_status',
    timestamps: true,
    paranoid: false, // Override global paranoid setting - status tracking doesn't need soft deletes
    underscored: true, // Use snake_case to match database schema
    indexes: [
      {
        fields: ['messageId'],
        name: 'idx_group_message_status_message',
      },
      {
        fields: ['userId'],
        name: 'idx_group_message_status_user',
      },
      {
        fields: ['messageId', 'userId'],
        name: 'idx_group_message_status_unique',
        unique: true,
      },
      {
        fields: ['status'],
        name: 'idx_group_message_status_status',
      },
      {
        fields: ['deliveredAt'],
        name: 'idx_group_message_status_delivered',
      },
      {
        fields: ['readAt'],
        name: 'idx_group_message_status_read',
      },
    ],
  }
);

// Instance methods
GroupMessageStatus.prototype.markAsDelivered = async function () {
  if (this.status !== 'delivered' && this.status !== 'read') {
    this.status = 'delivered';
    this.deliveredAt = new Date();
    await this.save();
  }
};

GroupMessageStatus.prototype.markAsRead = async function () {
  if (this.status !== 'read') {
    this.status = 'read';
    this.readAt = new Date();
    await this.save();
  }
};

// Static methods
GroupMessageStatus.findOrCreateStatus = async function (messageId, userId) {
  const [status, created] = await GroupMessageStatus.findOrCreate({
    where: { messageId, userId },
    defaults: {
      messageId,
      userId,
      status: 'sent',
    },
  });

  return { status, created };
};

GroupMessageStatus.getMessageStatusForUser = async function (messageId, userId) {
  return await GroupMessageStatus.findOne({
    where: { messageId, userId },
  });
};

GroupMessageStatus.getMessageStatusForGroup = async function (messageId) {
  return await GroupMessageStatus.findAll({
    where: { messageId },
    include: [
      {
        model: await import('./User.js').then(m => m.User),
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'],
      },
    ],
    order: [['created_at', 'ASC']],
  });
};

GroupMessageStatus.getUnreadCountForUser = async function (userId) {
  return await GroupMessageStatus.count({
    where: {
      userId,
      status: {
        [Op.ne]: 'read',
      },
    },
  });
};

GroupMessageStatus.getUnreadMessagesForUser = async function (userId) {
  return await GroupMessageStatus.findAll({
    where: {
      userId,
      status: {
        [Op.ne]: 'read',
      },
    },
    include: [
      {
        model: await import('./Message.js').then(m => m.Message),
        as: 'message',
        include: [
          {
            model: await import('./User.js').then(m => m.User),
            as: 'sender',
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'],
          },
          {
            model: await import('./Group.js').then(m => m.Group),
            as: 'group',
            attributes: ['id', 'name', 'avatar'],
          },
        ],
      },
    ],
    order: [['created_at', 'DESC']],
  });
};

// Hooks
GroupMessageStatus.afterUpdate(async status => {
  // Update the main message's last activity if this is the most recent status change
  if (status.messageId) {
    const { Message } = await import('./Message.js');
    const message = await Message.findByPk(status.messageId);
    if (message) {
      // Update group lastMessageAt if this message was read
      if (status.status === 'read' && message.groupId) {
        const { Group } = await import('./Group.js');
        await Group.update({ lastMessageAt: new Date() }, { where: { id: message.groupId } });
      }
    }
  }
});

export default GroupMessageStatus;
