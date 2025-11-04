import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

export const GroupMember = sequelize.define(
  'GroupMember',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
      allowNull: false,
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'groups',
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
    role: {
      type: DataTypes.ENUM('admin', 'moderator', 'member'),
      defaultValue: 'member',
      allowNull: false,
      validate: {
        isIn: {
          args: [['admin', 'moderator', 'member']],
          msg: 'Role must be admin, moderator, or member',
        },
      },
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    leftAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        canSendMessages: true,
        canInviteMembers: false,
        canRemoveMembers: false,
        canEditGroup: false,
        canDeleteMessages: false,
      },
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isMuted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
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
    tableName: 'groupMembers',
    timestamps: true,
    paranoid: true,
    underscored: false,
    indexes: [
      {
        fields: ['groupId'],
        name: 'idx_group_members_group',
      },
      {
        fields: ['userId'],
        name: 'idx_group_members_user',
      },
      {
        fields: ['groupId', 'isActive'],
        name: 'idx_group_members_group_active',
      },
      {
        fields: ['userId', 'isActive'],
        name: 'idx_group_members_user_active',
      },
      {
        fields: ['role'],
        name: 'idx_group_members_role',
      },
      {
        fields: ['joinedAt'],
        name: 'idx_group_members_joined_at',
      },
      {
        fields: ['leftAt'],
        name: 'idx_group_members_left_at',
      },
      {
        fields: ['groupId', 'userId'],
        name: 'idx_group_members_unique_user_group',
        unique: true,
      },
      {
        fields: ['groupId', 'isActive', 'joinedAt'],
        name: 'idx_group_members_active_sorted',
        where: {
          isActive: true,
        },
        order: [['joinedAt', 'ASC']],
      },
      {
        fields: ['userId', 'isActive', 'lastSeenAt'],
        name: 'idx_group_members_user_groups',
        where: {
          isActive: true,
        },
        order: [['lastSeenAt', 'DESC']],
      },
    ],
  }
);

// Instance methods
GroupMember.prototype.leaveGroup = async function () {
  if (!this.isActive) {
    throw new Error('User is not an active member of this group');
  }

  this.leftAt = new Date();
  this.isActive = false;
  await this.save();

  return this;
};

GroupMember.prototype.updateLastSeen = async function () {
  this.lastSeenAt = new Date();
  await this.save();
};

GroupMember.prototype.mute = async function () {
  this.isMuted = true;
  await this.save();
  return this;
};

GroupMember.prototype.unmute = async function () {
  this.isMuted = false;
  await this.save();
  return this;
};

GroupMember.prototype.hasPermission = function (permission) {
  return this.permissions && this.permissions[permission] === true;
};

GroupMember.prototype.canInviteMembers = function () {
  return (
    this.role === 'admin' || this.role === 'moderator' || this.hasPermission('canInviteMembers')
  );
};

GroupMember.prototype.canRemoveMembers = function () {
  return this.role === 'admin' || this.hasPermission('canRemoveMembers');
};

GroupMember.prototype.canEditGroup = function () {
  return this.role === 'admin' || this.hasPermission('canEditGroup');
};

GroupMember.prototype.canDeleteMessages = function () {
  return (
    this.role === 'admin' || this.role === 'moderator' || this.hasPermission('canDeleteMessages')
  );
};

GroupMember.prototype.promote = async function (newRole) {
  if (!['admin', 'moderator', 'member'].includes(newRole)) {
    throw new Error('Invalid role');
  }

  if (this.role === 'admin' && newRole !== 'admin') {
    // Check if there are other admins
    const { default: GroupMember } = await import('./GroupMember.js');
    const adminCount = await GroupMember.count({
      where: {
        groupId: this.groupId,
        role: 'admin',
        isActive: true,
      },
    });

    if (adminCount <= 1) {
      throw new Error('Cannot demote last admin');
    }
  }

  this.role = newRole;
  await this.save();
};

GroupMember.prototype.isAdmin = function () {
  return this.role === 'admin';
};

GroupMember.prototype.isModerator = function () {
  return this.role === 'moderator' || this.role === 'admin';
};

// Static methods
GroupMember.findActiveMembers = function (groupId, options = {}) {
  return this.findAll({
    where: {
      groupId,
      isActive: true,
    },
    order: [['joinedAt', 'ASC']],
    ...options,
  });
};

GroupMember.findUserGroups = function (userId, options = {}) {
  return this.findAll({
    where: {
      userId,
      isActive: true,
    },
    order: [['lastSeenAt', 'DESC']],
    ...options,
  });
};

GroupMember.getGroupRole = function (groupId, userId) {
  return this.findOne({
    where: {
      groupId,
      userId,
      isActive: true,
    },
    attributes: ['role'],
  });
};

GroupMember.countActiveMembers = function (groupId) {
  return this.count({
    where: {
      groupId,
      isActive: true,
    },
  });
};

// Hooks
GroupMember.beforeCreate(async membership => {
  // Validate that user isn't already a member
  const existing = await GroupMember.findOne({
    where: {
      groupId: membership.groupId,
      userId: membership.userId,
    },
  });

  if (existing && existing.isActive) {
    throw new Error('User is already a member of this group');
  }

  // If reactivating a previous membership, update joinedAt
  if (existing && !existing.isActive) {
    existing.isActive = true;
    existing.leftAt = null;
    existing.joinedAt = new Date();
    await existing.save();
    throw new Error('Membership reactivated'); // This will prevent the new creation
  }
});

GroupMember.beforeUpdate(async membership => {
  // Prevent multiple active memberships for same user-group pair
  if (membership.isActive && membership.isActive !== membership._previousDataValues.isActive) {
    const conflicting = await GroupMember.findOne({
      where: {
        groupId: membership.groupId,
        userId: membership.userId,
        isActive: true,
      },
    });

    if (conflicting && conflicting.id !== membership.id) {
      throw new Error('User already has an active membership in this group');
    }
  }
});

export default GroupMember;
