import { DataTypes, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

export const Group = sequelize.define(
  'Group',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Group name is required',
        },
        len: {
          args: [1, 100],
          msg: 'Group name must be between 1 and 100 characters',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 1000],
          msg: 'Group description must be less than 1000 characters',
        },
      },
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    maxMembers: {
      type: DataTypes.INTEGER,
      defaultValue: 20,
      allowNull: false,
      validate: {
        min: {
          args: 2,
          msg: 'Group must allow at least 2 members',
        },
        max: {
          args: 20,
          msg: 'Group cannot exceed 20 members',
        },
      },
    },
    groupType: {
      type: DataTypes.ENUM('private', 'public'),
      defaultValue: 'private',
      allowNull: false,
      validate: {
        isIn: {
          args: [['private', 'public']],
          msg: 'Group type must be either private or public',
        },
      },
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'Avatar must be a valid URL',
        },
      },
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        allowMemberInvite: true,
        allowFileSharing: true,
        messageRetention: 30, // days
      },
    },
    encryptionKey: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64-encoded AES-256 encryption key for group messages (server-side encryption)',
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
    tableName: 'groups',
    timestamps: true,
    paranoid: false, // No soft deletes
    underscored: true, // camelCase columns
    indexes: [
      {
        fields: ['creatorId'],
        name: 'idx_groups_creator',
      },
      {
        fields: ['isActive'],
        name: 'idx_groups_active',
      },
      {
        fields: ['groupType'],
        name: 'idx_groups_type',
      },
      {
        fields: ['createdAt'],
        name: 'idx_groups_created_at',
      },
      {
        fields: ['lastMessageAt'],
        name: 'idx_groups_last_message',
      },
      {
        fields: ['name'],
        name: 'idx_groups_name',
      },
      {
        fields: ['name', 'description'],
        name: 'idx_groups_search_gin',
        using: 'gin',
        operator: 'gin_trgm_ops',
      },
    ],
  }
);

// Instance methods
Group.prototype.isMember = async function (userId) {
  const { GroupMember: groupMemberModel } = await import('./index.js');
  const membership = await groupMemberModel.findOne({
    where: {
      groupId: this.id,
      userId,
      isActive: true,
    },
  });
  return !!membership;
};

Group.prototype.getMemberCount = async function () {
  const { GroupMember: groupMemberModel } = await import('./index.js');
  return await groupMemberModel.count({
    where: {
      groupId: this.id,
      isActive: true,
    },
  });
};

Group.prototype.getMembers = async function (options = {}) {
  const { GroupMember: groupMemberModel } = await import('./index.js');
  const { User } = await import('./index.js');

  return await groupMemberModel.findAll({
    where: {
      groupId: this.id,
      isActive: true,
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'status'],
      },
    ],
    order: [['joinedAt', 'ASC']],
    ...options,
  });
};

Group.prototype.getAdmins = async function () {
  const { GroupMember: groupMemberModel } = await import('./index.js');
  const { User } = await import('./index.js');

  return await groupMemberModel.findAll({
    where: {
      groupId: this.id,
      role: {
        [Op.in]: ['admin', 'moderator'],
      },
      isActive: true,
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'status'],
      },
    ],
    order: [
      ['role', 'ASC'],
      ['joinedAt', 'ASC'],
    ],
  });
};

Group.prototype.canUserJoin = async function (userId) {
  if (this.groupType === 'public') {
    return true;
  }

  // For private groups, check if user is invited or is admin/creator
  const { GroupMember: groupMemberModel } = await import('./index.js');
  const membership = await groupMemberModel.findOne({
    where: {
      groupId: this.id,
      userId,
      isActive: true,
    },
  });

  return !!membership;
};

Group.prototype.addMember = async function (userId, invitedBy, role = 'member') {
  if (await this.isMember(userId)) {
    throw new Error('User is already a member of this group');
  }

  const currentCount = await this.getMemberCount();
  if (currentCount >= this.maxMembers) {
    throw new Error('Group has reached maximum member limit');
  }

  const { GroupMember: groupMemberModel } = await import('./index.js');
  return await groupMemberModel.create({
    groupId: this.id,
    userId,
    role,
    invitedBy,
    joinedAt: new Date(),
  });
};

Group.prototype.removeMember = async function (userId) {
  const { GroupMember: groupMemberModel } = await import('./index.js');
  const membership = await groupMemberModel.findOne({
    where: {
      groupId: this.id,
      userId,
      isActive: true,
    },
  });

  if (!membership) {
    throw new Error('User is not a member of this group');
  }

  membership.leftAt = new Date();
  membership.isActive = false;
  await membership.save();

  return membership;
};

Group.prototype.updateLastMessage = async function () {
  this.lastMessageAt = new Date();
  await this.save();
};

// Static methods
Group.findGroupsForUser = async function (userId, options = {}) {
  const { GroupMember: groupMemberModel } = await import('./index.js');

  return groupMemberModel.findAll({
    where: {
      userId,
      isActive: true,
    },
    include: [
      {
        model: Group,
        as: 'group',
        where: {
          isActive: true,
        },
        required: true,
      },
    ],
    order: [[{ model: Group, as: 'group' }, 'lastMessageAt', 'DESC']],
    ...options,
  });
};

Group.searchGroups = function (query, options = {}) {
  return this.findAll({
    where: {
      isActive: true,
      groupType: 'public',
      [Op.or]: [
        {
          name: {
            [Op.iLike]: `%${query}%`,
          },
        },
        {
          description: {
            [Op.iLike]: `%${query}%`,
          },
        },
      ],
    },
    order: [['created_at', 'DESC']],
    ...options,
  });
};

// Hooks
Group.beforeCreate(async group => {
  try {
    // Generate AES-256 encryption key for group messages (server-side encryption)
    const encryptionService = (await import('../utils/encryption.js')).default;
    group.encryptionKey = encryptionService.generateAES256Key();
  } catch (error) {
    console.warn('Failed to generate encryption key for group:', error.message);
    // Continue without encryption key for now
  }
});

// FIX BUG-G008: Removed duplicate afterCreate hook
// Creator membership is now handled explicitly in createGroup controller within transaction
// This prevents duplicate membership records

export default Group;
