'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('audit_logs', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'User who performed the action (null for system actions)',
    },
    action: {
      type: Sequelize.STRING(100),
      allowNull: false,
      comment: 'Action type (e.g., user_login, user_deactivate, message_delete)',
    },
    resource_type: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Type of resource affected (user, message, file, etc.)',
    },
    resource_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID of the affected resource',
    },
    details: {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional details about the action',
    },
    ip_address: {
      type: Sequelize.INET,
      allowNull: true,
      comment: 'IP address of the request',
    },
    user_agent: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'User agent string',
    },
    severity: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'low',
      comment: 'Severity level of the action',
    },
    status: {
      type: Sequelize.ENUM('success', 'failure', 'pending'),
      allowNull: false,
      defaultValue: 'success',
      comment: 'Status of the action',
    },
    error_message: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Error message if action failed',
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  // Create indexes
  await queryInterface.addIndex('audit_logs', ['user_id']);
  await queryInterface.addIndex('audit_logs', ['action']);
  await queryInterface.addIndex('audit_logs', ['resource_type', 'resource_id']);
  await queryInterface.addIndex('audit_logs', ['created_at']);
  await queryInterface.addIndex('audit_logs', ['severity']);
  await queryInterface.addIndex('audit_logs', ['status']);
  await queryInterface.addIndex('audit_logs', ['ip_address']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('audit_logs');
}
