'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('notification_settings', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
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
    inAppEnabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    emailEnabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    pushEnabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    quietHoursStart: {
      type: Sequelize.TIME,
      allowNull: true,
      validate: {
        is: {
          args: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'Quiet hours start must be in HH:MM format',
        },
      },
    },
    quietHoursEnd: {
      type: Sequelize.TIME,
      allowNull: true,
      validate: {
        is: {
          args: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'Quiet hours end must be in HH:MM format',
        },
      },
    },
    doNotDisturb: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    messageNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    callNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    mentionNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    adminNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    systemNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
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
  await queryInterface.addIndex('notification_settings', ['userId'], {
    name: 'idx_notification_settings_user_id_unique',
    unique: true,
  });

  // Index for quick lookups by notification preferences
  await queryInterface.addIndex('notification_settings', ['inAppEnabled'], {
    name: 'idx_notification_settings_in_app_enabled',
  });

  await queryInterface.addIndex('notification_settings', ['emailEnabled'], {
    name: 'idx_notification_settings_email_enabled',
  });

  await queryInterface.addIndex('notification_settings', ['pushEnabled'], {
    name: 'idx_notification_settings_push_enabled',
  });

  await queryInterface.addIndex('notification_settings', ['doNotDisturb'], {
    name: 'idx_notification_settings_dnd',
  });

  // Composite index for quiet hours queries
  await queryInterface.addIndex('notification_settings',
    ['quietHoursStart', 'quietHoursEnd'],
    {
      name: 'idx_notification_settings_quiet_hours',
    }
  );

  // Index for settings updated timestamp for cache invalidation
  await queryInterface.addIndex('notification_settings', ['updatedAt'], {
    name: 'idx_notification_settings_updated_at',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('notification_settings');
}