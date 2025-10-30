'use strict';

export async function up(queryInterface, Sequelize) {
  const tableDescription = await queryInterface.describeTable('audit_logs');

  // Rename columns from snake_case to camelCase
  if (tableDescription.user_id) {
    await queryInterface.renameColumn('audit_logs', 'user_id', 'userId');
  }

  if (tableDescription.resource_type) {
    await queryInterface.renameColumn('audit_logs', 'resource_type', 'resourceType');
  }

  if (tableDescription.resource_id) {
    await queryInterface.renameColumn('audit_logs', 'resource_id', 'resourceId');
  }

  if (tableDescription.ip_address) {
    await queryInterface.renameColumn('audit_logs', 'ip_address', 'ipAddress');
  }

  if (tableDescription.user_agent) {
    await queryInterface.renameColumn('audit_logs', 'user_agent', 'userAgent');
  }

  if (tableDescription.error_message) {
    await queryInterface.renameColumn('audit_logs', 'error_message', 'errorMessage');
  }

  if (tableDescription.created_at) {
    await queryInterface.renameColumn('audit_logs', 'created_at', 'createdAt');
  }
}

export async function down(queryInterface, Sequelize) {
  const tableDescription = await queryInterface.describeTable('audit_logs');

  // Revert columns back to snake_case
  if (tableDescription.userId) {
    await queryInterface.renameColumn('audit_logs', 'userId', 'user_id');
  }

  if (tableDescription.resourceType) {
    await queryInterface.renameColumn('audit_logs', 'resourceType', 'resource_type');
  }

  if (tableDescription.resourceId) {
    await queryInterface.renameColumn('audit_logs', 'resourceId', 'resource_id');
  }

  if (tableDescription.ipAddress) {
    await queryInterface.renameColumn('audit_logs', 'ipAddress', 'ip_address');
  }

  if (tableDescription.userAgent) {
    await queryInterface.renameColumn('audit_logs', 'userAgent', 'user_agent');
  }

  if (tableDescription.errorMessage) {
    await queryInterface.renameColumn('audit_logs', 'errorMessage', 'error_message');
  }

  if (tableDescription.createdAt) {
    await queryInterface.renameColumn('audit_logs', 'createdAt', 'created_at');
  }
}
