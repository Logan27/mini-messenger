'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('reports', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reporter_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'User who submitted the report',
    },
    reported_user_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Reported user (if reporting a user)',
    },
    reported_message_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Reported message (if reporting a message)',
    },
    reported_file_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'files',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Reported file (if reporting a file)',
    },
    report_type: {
      type: Sequelize.ENUM('user', 'message', 'file', 'other'),
      allowNull: false,
      defaultValue: 'user',
      comment: 'Type of report',
    },
    reason: {
      type: Sequelize.ENUM(
        'harassment',
        'spam',
        'inappropriate_content',
        'hate_speech',
        'violence',
        'impersonation',
        'malware',
        'other'
      ),
      allowNull: false,
      comment: 'Reason for the report',
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: 'Detailed description of the issue',
    },
    evidence: {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Evidence (screenshots, links, etc.)',
    },
    status: {
      type: Sequelize.ENUM('pending', 'investigating', 'resolved', 'dismissed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Status of the report',
    },
    reviewed_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Admin who reviewed the report',
    },
    reviewed_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the report was reviewed',
    },
    resolution: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Resolution notes from admin',
    },
    action_taken: {
      type: Sequelize.ENUM(
        'no_action',
        'warning_issued',
        'content_removed',
        'user_suspended',
        'user_banned',
        'other'
      ),
      allowNull: true,
      comment: 'Action taken as a result of the report',
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
  });

  // Create indexes
  await queryInterface.addIndex('reports', ['reporter_id']);
  await queryInterface.addIndex('reports', ['reported_user_id']);
  await queryInterface.addIndex('reports', ['reported_message_id']);
  await queryInterface.addIndex('reports', ['status']);
  await queryInterface.addIndex('reports', ['created_at']);
  await queryInterface.addIndex('reports', ['reviewed_by']);
  await queryInterface.addIndex('reports', ['reason']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('reports');
}
