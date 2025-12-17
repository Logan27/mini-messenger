'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('group_members', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    group_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    user_id: {
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
    joined_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    left_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    invited_by: {
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
    last_seen_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // Create optimized indexes for performance
  await queryInterface.addIndex('group_members', ['group_id'], {
    name: 'idx_group_members_group',
  });

  await queryInterface.addIndex('group_members', ['user_id'], {
    name: 'idx_group_members_user',
  });

  await queryInterface.addIndex('group_members', ['group_id', 'is_active'], {
    name: 'idx_group_members_group_active',
  });

  await queryInterface.addIndex('group_members', ['user_id', 'is_active'], {
    name: 'idx_group_members_user_active',
  });

  await queryInterface.addIndex('group_members', ['role'], {
    name: 'idx_group_members_role',
  });

  await queryInterface.addIndex('group_members', ['joined_at'], {
    name: 'idx_group_members_joined_at',
  });

  await queryInterface.addIndex('group_members', ['left_at'], {
    name: 'idx_group_members_left_at',
  });

  // Composite unique constraint for user-group pairs (one user can only be in a group once)
  await queryInterface.addIndex('group_members', ['group_id', 'user_id'], {
    name: 'idx_group_members_unique_user_group',
    unique: true,
  });

  // Index for finding active members in a group
  await queryInterface.addIndex('group_members',
    ['group_id', 'is_active', 'joined_at'],
    {
      name: 'idx_group_members_active_sorted',
      where: {
        is_active: true,
      },
      order: [['joined_at', 'ASC']],
    }
  );

  // Index for finding groups a user is member of
  await queryInterface.addIndex('group_members',
    ['user_id', 'is_active', 'last_seen_at'],
    {
      name: 'idx_group_members_user_groups',
      where: {
        is_active: true,
      },
      order: [['last_seen_at', 'DESC']],
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('groupMembers');
}