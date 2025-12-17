'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Create message_edit_history table
    await queryInterface.createTable('message_edit_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      message_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'messages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      previous_content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      new_content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      edited_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      edited_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
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

    // Add indexes for performance (use raw SQL to handle IF NOT EXISTS)
    await queryInterface.addIndex('message_edit_history', ['message_id'], {
      name: 'idx_message_edit_history_message_id',
      unique: false,
    });

    await queryInterface.addIndex('message_edit_history', ['edited_by'], {
      name: 'idx_message_edit_history_edited_by',
      unique: false,
    });

    await queryInterface.addIndex('message_edit_history', ['edited_at'], {
      name: 'idx_message_edit_history_edited_at',
      unique: false,
    });

    await queryInterface.addIndex('message_edit_history', ['deleted_at'], {
      name: 'idx_message_edit_history_deleted_at',
      unique: false,
    });

    // Add a column to messages table for delete type (for me vs everyone)
    await queryInterface.addColumn('messages', 'delete_type', {
      type: Sequelize.ENUM('soft', 'hard'),
      allowNull: true,
      defaultValue: null,
      comment: 'soft = deleted for sender only, hard = deleted for everyone',
    });

    // Add index for delete_type
    await queryInterface.addIndex('messages', ['delete_type'], {
      name: 'idx_messages_delete_type',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the delete_type column from messages
    await queryInterface.removeColumn('messages', 'delete_type');

    // Drop the message_edit_history table
    await queryInterface.dropTable('message_edit_history');
  }
};