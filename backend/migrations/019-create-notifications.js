'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('notifications', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
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
      comment: 'User who owns the notification',
    },
    type: {
      type: Sequelize.ENUM('message', 'call', 'mention', 'admin', 'system'),
      allowNull: false,
      comment: 'Type of notification',
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: 'Notification title',
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: 'Notification content/body',
    },
    data: {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional data associated with the notification (e.g., messageId, callId, etc.)',
    },
    read: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the notification has been read',
    },
    priority: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
      comment: 'Priority level of the notification',
    },
    category: {
      type: Sequelize.ENUM('message', 'call', 'mention', 'admin', 'system'),
      allowNull: false,
      comment: 'Category of the notification',
    },
    expires_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the notification expires (auto-delete after 30 days)',
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  // Create indexes for performance
  await queryInterface.addIndex('notifications', ['user_id'], {
    name: 'idx_notifications_user_id',
  });

  await queryInterface.addIndex('notifications', ['user_id', 'read'], {
    name: 'idx_notifications_user_read',
  });

  await queryInterface.addIndex('notifications', ['user_id', 'created_at'], {
    name: 'idx_notifications_user_created',
  });

  await queryInterface.addIndex('notifications', ['type'], {
    name: 'idx_notifications_type',
  });

  await queryInterface.addIndex('notifications', ['priority'], {
    name: 'idx_notifications_priority',
  });

  await queryInterface.addIndex('notifications', ['category'], {
    name: 'idx_notifications_category',
  });

  await queryInterface.addIndex('notifications', ['read', 'created_at'], {
    name: 'idx_notifications_read_created',
  });

  await queryInterface.addIndex('notifications', ['expires_at'], {
    name: 'idx_notifications_expires_at',
  });

  // Unique index on id (primary key already handles this, but explicit for clarity)
  await queryInterface.addIndex('notifications', ['id'], {
    unique: true,
    name: 'idx_notifications_id_unique',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('notifications');
}