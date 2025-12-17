'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('groups', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000],
      },
    },
    created_by: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    max_members: {
      type: Sequelize.INTEGER,
      defaultValue: 100,
      allowNull: false,
      validate: {
        min: 2,
        max: 1000,
      },
    },
    group_type: {
      type: Sequelize.ENUM('private', 'public'),
      defaultValue: 'private',
      allowNull: false,
    },
    avatar: {
      type: Sequelize.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    last_message_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    settings: {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {
        allowMemberInvite: true,
        allowFileSharing: true,
        messageRetention: 30, // days
      },
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    deleted_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  // Create optimized indexes for performance
  await queryInterface.addIndex('groups', ['created_by'], {
    name: 'idx_groups_creator_uuid',
  });

  await queryInterface.addIndex('groups', ['is_active'], {
    name: 'idx_groups_is_active',
  });

  await queryInterface.addIndex('groups', ['group_type'], {
    name: 'idx_groups_group_type',
  });

  await queryInterface.addIndex('groups', ['created_at'], {
    name: 'idx_groups_created_at_idx',
  });

  await queryInterface.addIndex('groups', ['last_message_at'], {
    name: 'idx_groups_last_message_at',
  });

  // Unique constraint for group name per creator (for now)
  await queryInterface.addIndex('groups', ['name'], {
    name: 'idx_groups_name_unique',
  });

  // Full-text search index for group name and description
  await queryInterface.addIndex('groups',
    ['name', 'description'],
    {
      name: 'idx_groups_search_gin',
      using: 'gin',
      operator: 'gin_trgm_ops',
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('groups');
}