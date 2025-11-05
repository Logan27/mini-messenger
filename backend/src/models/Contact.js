import { DataTypes, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

export const Contact = sequelize.define(
  'Contact',
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
    },
    contactUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'blocked'),
      defaultValue: 'pending',
      allowNull: false,
      validate: {
        isIn: {
          args: [['pending', 'accepted', 'blocked']],
          msg: 'Status must be pending, accepted, or blocked',
        },
      },
    },
    blockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    nickname: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Nickname must be less than 100 characters',
        },
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Notes must be less than 500 characters',
        },
      },
    },
    isFavorite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    isMuted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    lastContactAt: {
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'contacts',
    underscored: false, // Table uses camelCase columns
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['userId'],
        name: 'idx_contacts_user',
      },
      {
        fields: ['contactUserId'],
        name: 'idx_contacts_contact_user',
      },
      {
        fields: ['status'],
        name: 'idx_contacts_status',
      },
      {
        fields: ['isFavorite'],
        name: 'idx_contacts_favorite',
      },
      {
        fields: ['createdAt'],
        name: 'idx_contacts_created_at',
      },
      {
        fields: ['lastContactAt'],
        name: 'idx_contacts_last_contact',
      },
      {
        fields: ['userId', 'contactUserId'],
        name: 'idx_contacts_unique_user_contact',
        unique: true,
      },
      {
        fields: ['userId', 'status', 'isFavorite', 'lastContactAt'],
        name: 'idx_contacts_user_accepted',
        where: {
          status: 'accepted',
        },
        order: [
          ['isFavorite', 'DESC'],
          ['lastContactAt', 'DESC'],
        ],
      },
      {
        fields: ['userId', 'status'],
        name: 'idx_contacts_user_blocked',
        where: {
          status: 'blocked',
        },
      },
      {
        fields: ['contactUserId', 'status', 'createdAt'],
        name: 'idx_contacts_pending_requests',
        where: {
          status: 'pending',
        },
        order: [['createdAt', 'ASC']],
      },
    ],
  }
);

// Instance methods
Contact.prototype.accept = async function () {
  if (this.status !== 'pending') {
    throw new Error('Contact request is not pending');
  }

  this.status = 'accepted';
  await this.save();

  return this;
};

Contact.prototype.block = async function () {
  this.status = 'blocked';
  this.blockedAt = new Date();
  await this.save();

  return this;
};

Contact.prototype.unblock = async function () {
  if (this.status !== 'blocked') {
    throw new Error('Contact is not blocked');
  }

  this.status = 'accepted';
  this.blockedAt = null;
  await this.save();

  return this;
};

Contact.prototype.setFavorite = async function (isFavorite) {
  this.isFavorite = isFavorite;
  await this.save();
};

Contact.prototype.mute = async function () {
  this.isMuted = true;
  await this.save();
  return this;
};

Contact.prototype.unmute = async function () {
  this.isMuted = false;
  await this.save();
  return this;
};

Contact.prototype.updateLastContact = async function () {
  this.lastContactAt = new Date();
  await this.save();
};

Contact.prototype.isBlocked = function () {
  return this.status === 'blocked';
};

Contact.prototype.isAccepted = function () {
  return this.status === 'accepted';
};

Contact.prototype.isPending = function () {
  return this.status === 'pending';
};

// Static methods
Contact.findContactsForUser = function (userId, options = {}) {
  const whereCondition = {
    userId,
    status: 'accepted',
  };

  return this.findAll({
    where: whereCondition,
    order: [
      ['isFavorite', 'DESC'],
      ['lastContactAt', 'DESC'],
      ['createdAt', 'DESC'],
    ],
    ...options,
  });
};

Contact.findBlockedUsers = function (userId, options = {}) {
  return this.findAll({
    where: {
      userId,
      status: 'blocked',
    },
    ...options,
  });
};

Contact.findPendingRequests = function (userId, options = {}) {
  return this.findAll({
    where: {
      contactUserId: userId,
      status: 'pending',
    },
    order: [['createdAt', 'ASC']],
    ...options,
  });
};

Contact.sendRequest = async function (fromUserId, toUserId) {
  // Prevent self-contact
  if (fromUserId === toUserId) {
    throw new Error('Cannot send contact request to yourself');
  }

  // Check if request already exists (including soft-deleted)
  // First, try to find our own record (where userId = fromUserId)
  const existing = await Contact.findOne({
    where: {
      userId: fromUserId,
      contactUserId: toUserId,
    },
    paranoid: false, // Include soft-deleted records
  });

  // If our record exists, check if it's soft-deleted
  if (existing) {
    const wasDeleted = existing.deletedAt !== null;

    if (wasDeleted) {
      // Restore soft-deleted contact
      await existing.restore();
      // Update fields for new request
      existing.status = 'pending';
      existing.blockedAt = null;
      await existing.save();
      return existing;
    }

    // If not deleted, check status of our own record
    if (existing.status === 'accepted') {
      throw new Error('Users are already contacts');
    }
    if (existing.status === 'pending') {
      throw new Error('Contact request already pending');
    }
    if (existing.status === 'blocked') {
      throw new Error('Contact is blocked');
    }
  }

  // If our record doesn't exist, check if the reverse relationship exists
  const reverseExisting = await Contact.findOne({
    where: {
      userId: toUserId,
      contactUserId: fromUserId,
    },
    paranoid: false,
  });

  if (reverseExisting && reverseExisting.deletedAt === null) {
    // Reverse relationship exists and is not deleted
    if (reverseExisting.status === 'accepted') {
      throw new Error('Users are already contacts');
    }
    if (reverseExisting.status === 'pending') {
      throw new Error('Contact request already pending');
    }
    if (reverseExisting.status === 'blocked') {
      throw new Error('Contact is blocked');
    }
  }

  // Create new contact request
  return await Contact.create({
    userId: fromUserId,
    contactUserId: toUserId,
    status: 'pending',
  });
};

Contact.acceptRequest = async function (userId, contactUserId) {
  const contact = await Contact.findOne({
    where: {
      userId: contactUserId,
      contactUserId: userId,
      status: 'pending',
    },
  });

  if (!contact) {
    throw new Error('No pending contact request found');
  }

  return await contact.accept();
};

Contact.blockUser = async function (userId, contactUserId) {
  let contact = await Contact.findOne({
    where: {
      [Op.or]: [
        { userId, contactUserId },
        { userId: contactUserId, contactUserId: userId },
      ],
    },
  });

  if (!contact) {
    contact = await Contact.create({
      userId,
      contactUserId,
      status: 'blocked',
      blockedAt: new Date(),
    });
  } else {
    await contact.block();
  }

  return contact;
};

Contact.unblockUser = async function (userId, contactUserId) {
  const contact = await Contact.findOne({
    where: {
      [Op.or]: [
        { userId, contactUserId },
        { userId: contactUserId, contactUserId: userId },
      ],
      status: 'blocked',
    },
  });

  if (!contact) {
    throw new Error('Contact not found or not blocked');
  }

  return await contact.unblock();
};

Contact.removeContact = async function (userId, contactUserId) {
  const contact = await Contact.findOne({
    where: {
      [Op.or]: [
        { userId, contactUserId },
        { userId: contactUserId, contactUserId: userId },
      ],
      status: 'accepted',
    },
  });

  if (!contact) {
    throw new Error('Contact not found');
  }

  return await contact.destroy();
};

// Hooks
Contact.beforeCreate(async contact => {
  // Prevent self-contact
  if (contact.userId === contact.contactUserId) {
    throw new Error('Cannot create contact with yourself');
  }

  // Check for existing non-deleted relationship
  // Note: With paranoid mode, findOne automatically excludes soft-deleted records
  // But we're being explicit here for clarity
  const existing = await Contact.findOne({
    where: {
      [Op.or]: [
        { userId: contact.userId, contactUserId: contact.contactUserId },
        { userId: contact.contactUserId, contactUserId: contact.userId },
      ],
      deletedAt: null, // Explicitly exclude soft-deleted contacts
    },
  });

  if (existing) {
    throw new Error('Contact relationship already exists');
  }
});

export default Contact;
