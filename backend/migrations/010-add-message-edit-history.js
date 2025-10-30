'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Create messageEditHistory table (camelCase to match model)
    await queryInterface.createTable('messageEditHistory', {
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
      previousContent: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      newContent: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      editedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      editedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes for performance (use raw SQL to handle IF NOT EXISTS)
    await queryInterface.addIndex('messageEditHistory', ['messageId'], {
      name: 'idx_message_edit_history_message_id',
      unique: false,
    });

    await queryInterface.addIndex('messageEditHistory', ['editedBy'], {
      name: 'idx_message_edit_history_edited_by',
      unique: false,
    });

    await queryInterface.addIndex('messageEditHistory', ['editedAt'], {
      name: 'idx_message_edit_history_edited_at',
      unique: false,
    });

    await queryInterface.addIndex('messageEditHistory', ['deletedAt'], {
      name: 'idx_message_edit_history_deleted_at',
      unique: false,
    });

    // Add a column to messages table for delete type (for me vs everyone)
    await queryInterface.addColumn('messages', 'deleteType', {
      type: Sequelize.ENUM('soft', 'hard'),
      allowNull: true,
      defaultValue: null,
      comment: 'soft = deleted for sender only, hard = deleted for everyone',
    });

    // Add index for deleteType
    await queryInterface.addIndex('messages', ['deleteType'], {
      name: 'idx_messages_delete_type',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the deleteType column from messages
    await queryInterface.removeColumn('messages', 'deleteType');

    // Drop the messageEditHistory table
    await queryInterface.dropTable('messageEditHistory');
  }
};