'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('device_tokens', {
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
        onDelete: 'CASCADE',
        comment: 'User who owns this device token',
      },
      token: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'FCM device token for push notifications',
      },
      deviceType: {
        type: Sequelize.ENUM('web', 'android', 'ios'),
        allowNull: false,
        defaultValue: 'web',
        comment: 'Type of device',
      },
      deviceName: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Device name or browser info',
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser user agent string',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether this device token is active',
      },
      lastUsedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time this token was used',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('device_tokens', ['userId'], {
      name: 'idx_device_tokens_user_id',
    });

    await queryInterface.addIndex('device_tokens', ['userId', 'token'], {
      unique: true,
      name: 'idx_device_tokens_user_token_unique',
    });

    await queryInterface.addIndex('device_tokens', ['isActive'], {
      name: 'idx_device_tokens_is_active',
    });

    await queryInterface.addIndex('device_tokens', ['createdAt'], {
      name: 'idx_device_tokens_created_at',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('device_tokens');
  },
};
