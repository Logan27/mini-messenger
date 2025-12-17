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
    in_app_enabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    email_enabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    push_enabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    quiet_hours_start: {
      type: Sequelize.TIME,
      allowNull: true,
      validate: {
        is: {
          args: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'Quiet hours start must be in HH:MM format',
        },
      },
    },
    quiet_hours_end: {
      type: Sequelize.TIME,
      allowNull: true,
      validate: {
        is: {
          args: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'Quiet hours end must be in HH:MM format',
        },
      },
    },
    do_not_disturb: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    message_notifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    call_notifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    mention_notifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    admin_notifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    system_notifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
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
  await queryInterface.addIndex('notification_settings', ['user_id'], {
    name: 'idx_notification_settings_user_id_unique',
    unique: true,
  });

  // Index for quick lookups by notification preferences
  await queryInterface.addIndex('notification_settings', ['in_app_enabled'], {
    name: 'idx_notification_settings_in_app_enabled',
  });

  await queryInterface.addIndex('notification_settings', ['email_enabled'], {
    name: 'idx_notification_settings_email_enabled',
  });

  await queryInterface.addIndex('notification_settings', ['push_enabled'], {
    name: 'idx_notification_settings_push_enabled',
  });

  await queryInterface.addIndex('notification_settings', ['do_not_disturb'], {
    name: 'idx_notification_settings_dnd',
  });

  // Composite index for quiet hours queries
  await queryInterface.addIndex('notification_settings',
    ['quiet_hours_start', 'quiet_hours_end'],
    {
      name: 'idx_notification_settings_quiet_hours',
    }
  );

  // Index for settings updated timestamp for cache invalidation
  await queryInterface.addIndex('notification_settings', ['updated_at'], {
    name: 'idx_notification_settings_updated_at',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('notification_settings');
}