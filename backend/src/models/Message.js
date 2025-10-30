import { DataTypes, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';
import User from './User.js';

// MessageEditHistory model for tracking edit history
export const MessageEditHistory = sequelize.define(
  'MessageEditHistory',
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
    previousContent: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    newContent: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    editedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'messageEditHistory',
    paranoid: true,
    indexes: [
      {
        fields: ['messageId'],
        name: 'idx_message_edit_history_message_id',
      },
      {
        fields: ['editedBy'],
        name: 'idx_message_edit_history_edited_by',
      },
      {
        fields: ['editedAt'],
        name: 'idx_message_edit_history_edited_at',
      },
    ],
  }
);

// Define associations (moved after Message definition)

export const Message = sequelize.define(
  'Message',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
      allowNull: false,
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'groups',
        key: 'id',
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Message content is required',
        },
        len: {
          args: [1, 10000],
          msg: 'Message content must be between 1 and 10000 characters',
        },
      },
    },
    encryptedContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    encryptionMetadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Encryption metadata: algorithm, nonce, authTag for encrypted messages',
    },
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this message is end-to-end encrypted',
    },
    encryptionAlgorithm: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Encryption algorithm used (e.g., x25519-xsalsa20-poly1305, aes-256-gcm)',
    },
    messageType: {
      type: DataTypes.ENUM('text', 'image', 'file', 'system', 'call', 'location'),
      defaultValue: 'text',
      allowNull: false,
      validate: {
        isIn: {
          args: [['text', 'image', 'file', 'system', 'call', 'location']],
          msg: 'Invalid message type',
        },
      },
    },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed'),
      defaultValue: 'sent',
      allowNull: false,
      validate: {
        isIn: {
          args: [['sent', 'delivered', 'read', 'failed']],
          msg: 'Invalid message status',
        },
      },
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deleteType: {
      type: DataTypes.ENUM('soft', 'hard'),
      allowNull: true,
      defaultValue: null,
      comment: 'soft = deleted for sender only, hard = deleted for everyone',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    replyToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id',
      },
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: {
          args: [0, 255],
          msg: 'File name must be less than 255 characters',
        },
      },
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: 0,
          msg: 'File size cannot be negative',
        },
        max: {
          args: 100 * 1024 * 1024, // 100MB
          msg: 'File size cannot exceed 100MB',
        },
      },
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'MIME type must be less than 100 characters',
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
    tableName: 'messages',
    indexes: [
      {
        fields: ['recipientId', 'createdAt'],
        name: 'idx_messages_recipient_created_desc',
        order: [['createdAt', 'DESC']],
      },
      {
        fields: ['senderId', 'createdAt'],
        name: 'idx_messages_sender_created_desc',
        order: [['createdAt', 'DESC']],
      },
      {
        fields: ['groupId', 'createdAt'],
        name: 'idx_messages_group_created_desc',
        order: [['createdAt', 'DESC']],
      },
      {
        fields: ['status'],
        name: 'idx_messages_status',
      },
      {
        fields: ['messageType'],
        name: 'idx_messages_type',
      },
      {
        fields: ['replyToId'],
        name: 'idx_messages_reply_to',
      },
      {
        fields: ['senderId', 'recipientId', 'createdAt'],
        name: 'idx_messages_conversation_desc',
        order: [['createdAt', 'DESC']],
      },
      {
        fields: ['content'],
        name: 'idx_messages_content_gin',
        using: 'gin',
        operator: 'gin_trgm_ops',
      },
      {
        fields: ['recipientId', 'status', 'createdAt'],
        name: 'idx_messages_unread',
        where: {
          status: {
            [Op.ne]: 'read',
          },
        },
        order: [['createdAt', 'DESC']],
      },
      {
        fields: ['deletedAt'],
        name: 'idx_messages_deleted_cleanup',
        where: {
          deletedAt: {
            [Op.ne]: null,
          },
        },
      },
      {
        fields: ['isEncrypted'],
        name: 'idx_messages_encrypted',
      },
      {
        fields: ['isEncrypted', 'createdAt'],
        name: 'idx_messages_encrypted_created_desc',
        order: [['createdAt', 'DESC']],
      },
    ],
  }
);

// Instance methods
Message.prototype.markAsRead = async function () {
  if (this.status !== 'read') {
    this.status = 'read';
    await this.save();
  }
};

Message.prototype.markAsDelivered = async function () {
  if (this.status === 'sent') {
    this.status = 'delivered';
    await this.save();
  }
};

Message.prototype.edit = async function (newContent, editedByUserId) {
  // FIXED BUG-M003: Use transaction with pessimistic locking to prevent race conditions
  const transaction = await sequelize.transaction();

  try {
    // Lock the row for update (SELECT FOR UPDATE)
    const message = await Message.findByPk(this.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.deletedAt) {
      throw new Error('Cannot edit deleted message');
    }

    if (message.senderId !== editedByUserId) {
      throw new Error('Only the sender can edit their message');
    }

    // Re-check after acquiring lock
    if (message.editedAt !== null) {
      throw new Error('Message has already been edited');
    }

    const now = new Date();
    const editWindowMs = 5 * 60 * 1000; // 5 minutes

    if (now - message.createdAt >= editWindowMs) {
      throw new Error('Message can only be edited within 5 minutes of sending');
    }

    // Store edit history
    await MessageEditHistory.create({
      messageId: this.id,
      previousContent: message.content,
      newContent: newContent,
      editedBy: editedByUserId,
      editedAt: now,
    }, { transaction });

    // Update message
    message.content = newContent;
    message.editedAt = now;
    await message.save({ transaction });

    await transaction.commit();

    // Update current instance
    this.content = newContent;
    this.editedAt = now;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

Message.prototype.softDelete = async function (deleteType = 'soft') {
  // Check if hard delete is allowed (within 24 hours for sender)
  if (deleteType === 'hard') {
    const hoursSinceCreation = (new Date() - this.createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      throw new Error('Messages can only be deleted for everyone within 24 hours of sending');
    }
  }

  this.deletedAt = new Date();
  this.deleteType = deleteType;
  await this.save();
};

Message.prototype.isDeleted = function () {
  return !!(this.deletedAt && this.deletedAt <= new Date());
};

Message.prototype.canBeEditedBy = function (userId) {
  // Can only be edited by sender within 5 minutes
  return (
    this.senderId === userId &&
    !this.isDeleted() &&
    this.editedAt === null &&
    new Date() - this.createdAt < 5 * 60 * 1000
  ); // 5 minutes
};

Message.prototype.canBeDeletedBy = function (userId, deleteType = 'soft') {
  if (this.isDeleted()) {
    return false;
  }

  // Users can always soft delete their own messages
  if (deleteType === 'soft') {
    return this.senderId === userId;
  }

  // Hard delete only by sender within 24 hours
  if (deleteType === 'hard') {
    const hoursSinceCreation = (new Date() - this.createdAt) / (1000 * 60 * 60);
    return this.senderId === userId && hoursSinceCreation <= 24;
  }

  return false;
};

// Get edit history for this message
Message.prototype.getEditHistory = async function () {
  return await MessageEditHistory.findAll({
    where: { messageId: this.id },
    include: [
      {
        model: User,
        as: 'editor',
        attributes: ['id', 'username', 'firstName', 'lastName'],
      },
    ],
    order: [['editedAt', 'ASC']],
  });
};

// Static methods
Message.findConversation = function (userId1, userId2, options = {}) {
  const whereCondition = {
    [Op.or]: [
      { senderId: userId1, recipientId: userId2 },
      { senderId: userId2, recipientId: userId1 },
    ],
    deletedAt: null, // Exclude soft deleted messages
  };

  if (options.includeDeleted) {
    delete whereCondition.deletedAt;
  }

  return this.findAll({
    where: whereCondition,
    order: [['createdAt', 'ASC']],
    ...options,
  });
};

Message.findGroupMessages = function (groupId, options = {}) {
  const whereCondition = {
    groupId,
    deletedAt: null,
  };

  if (options.includeDeleted) {
    delete whereCondition.deletedAt;
  }

  return this.findAll({
    where: whereCondition,
    order: [['createdAt', 'ASC']],
    ...options,
  });
};

Message.findUnreadMessages = function (userId) {
  return this.findAll({
    where: {
      recipientId: userId,
      status: {
        [Op.ne]: 'read',
      },
    },
    order: [['createdAt', 'ASC']],
  });
};

Message.getRecentConversations = function (userId, limit = 20) {
  return this.findAll({
    where: {
      [Op.or]: [{ senderId: userId }, { recipientId: userId }],
      deletedAt: null,
    },
    attributes: [
      [
        sequelize.fn(
          'CASE',
          sequelize.literal(`WHEN "senderId" = '${userId}' THEN "recipientId" ELSE "senderId"`),
          'conversationWith'
        ),
      ],
      [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastMessageAt'],
    ],
    group: [
      sequelize.literal(
        `CASE WHEN "senderId" = '${userId}' THEN "recipientId" ELSE "senderId" END`
      ),
    ],
    order: [[sequelize.fn('MAX', sequelize.col('createdAt')), 'DESC']],
    limit,
    raw: true,
  });
};

// Hooks
Message.beforeCreate(async message => {
  // Validate that either recipientId or groupId is set, but not both
  if ((!message.recipientId && !message.groupId) || (message.recipientId && message.groupId)) {
    throw new Error('Message must have either recipientId or groupId, but not both');
  }

  // Set message type based on content or file
  if (message.fileName && !message.messageType) {
    if (message.mimeType?.startsWith('image/')) {
      message.messageType = 'image';
    } else {
      message.messageType = 'file';
    }
  }
});

Message.afterCreate(async message => {
  // Update group's lastMessageAt when a new message is sent
  if (message.groupId) {
    const { Group } = await import('./index.js');
    await Group.update({ lastMessageAt: message.createdAt }, { where: { id: message.groupId } });
  }

  // Update contact's lastContactAt for direct messages
  if (message.recipientId && message.senderId !== message.recipientId) {
    const { Contact } = await import('./index.js');
    await Contact.update(
      { lastContactAt: message.createdAt },
      {
        where: {
          [Op.or]: [
            { userId: message.senderId, contactUserId: message.recipientId },
            { userId: message.recipientId, contactUserId: message.senderId },
          ],
        },
      }
    );
  }
});

// Define associations after both models are defined
MessageEditHistory.belongsTo(Message, { foreignKey: 'messageId' });

export default Message;
