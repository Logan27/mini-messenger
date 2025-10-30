'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('groupMembers', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    groupId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    role: {
      type: Sequelize.ENUM('admin', 'moderator', 'member'),
      defaultValue: 'member',
      allowNull: false,
    },
    joinedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    leftAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    invitedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    permissions: {
      type: Sequelize.JSONB,
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
      type: Sequelize.DATE,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // Create optimized indexes for performance
  await queryInterface.addIndex('groupMembers', ['groupId'], {
    name: 'idx_group_members_group',
  });

  await queryInterface.addIndex('groupMembers', ['userId'], {
    name: 'idx_group_members_user',
  });

  await queryInterface.addIndex('groupMembers', ['groupId', 'isActive'], {
    name: 'idx_group_members_group_active',
  });

  await queryInterface.addIndex('groupMembers', ['userId', 'isActive'], {
    name: 'idx_group_members_user_active',
  });

  await queryInterface.addIndex('groupMembers', ['role'], {
    name: 'idx_group_members_role',
  });

  await queryInterface.addIndex('groupMembers', ['joinedAt'], {
    name: 'idx_group_members_joined_at',
  });

  await queryInterface.addIndex('groupMembers', ['leftAt'], {
    name: 'idx_group_members_left_at',
  });

  // Composite unique constraint for user-group pairs (one user can only be in a group once)
  await queryInterface.addIndex('groupMembers', ['groupId', 'userId'], {
    name: 'idx_group_members_unique_user_group',
    unique: true,
  });

  // Index for finding active members in a group
  await queryInterface.addIndex('groupMembers',
    ['groupId', 'isActive', 'joinedAt'],
    {
      name: 'idx_group_members_active_sorted',
      where: {
        isActive: true,
      },
      order: [['joinedAt', 'ASC']],
    }
  );

  // Index for finding groups a user is member of
  await queryInterface.addIndex('groupMembers',
    ['userId', 'isActive', 'lastSeenAt'],
    {
      name: 'idx_group_members_user_groups',
      where: {
        isActive: true,
      },
      order: [['lastSeenAt', 'DESC']],
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('groupMembers');
}