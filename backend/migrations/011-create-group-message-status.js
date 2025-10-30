'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('groupMessageStatus', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      messageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'messages',
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
      status: {
        type: Sequelize.ENUM('sent', 'delivered', 'read'),
        defaultValue: 'sent',
        allowNull: false,
      },
      deliveredAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      readAt: {
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

    // Add indexes for better performance
    await queryInterface.addIndex('groupMessageStatus', ['messageId'], {
      name: 'idx_group_message_status_message',
    });

    await queryInterface.addIndex('groupMessageStatus', ['userId'], {
      name: 'idx_group_message_status_user',
    });

    await queryInterface.addIndex('groupMessageStatus', ['messageId', 'userId'], {
      name: 'idx_group_message_status_unique',
      unique: true,
    });

    await queryInterface.addIndex('groupMessageStatus', ['status'], {
      name: 'idx_group_message_status_status',
    });

    await queryInterface.addIndex('groupMessageStatus', ['deliveredAt'], {
      name: 'idx_group_message_status_delivered',
    });

    await queryInterface.addIndex('groupMessageStatus', ['readAt'], {
      name: 'idx_group_message_status_read',
    });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('groupMessageStatus');

  // Drop the ENUM type
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_groupMessageStatus_status";');
}