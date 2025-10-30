import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

/**
 * AuditLog Model
 * Tracks all sensitive administrative actions and security events
 */
const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who performed the action (null for system actions)',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Action type (e.g., user_login, user_deactivate, message_delete)',
    },
    resourceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Type of resource affected (user, message, file, etc.)',
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID of the affected resource',
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional details about the action',
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true,
      comment: 'IP address of the request',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string',
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'low',
      comment: 'Severity level of the action',
    },
    status: {
      type: DataTypes.ENUM('success', 'failure', 'pending'),
      allowNull: false,
      defaultValue: 'success',
      comment: 'Status of the action',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if action failed',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'auditLogs',
    underscored: false, // Use camelCase for field names
    timestamps: false,
    indexes: [
      { fields: ['userId'] },
      { fields: ['action'] },
      { fields: ['resourceType', 'resourceId'] },
      { fields: ['createdAt'] },
      { fields: ['severity'] },
      { fields: ['status'] },
      { fields: ['ipAddress'] },
    ],
  }
);

// Associations
AuditLog.associate = models => {
  AuditLog.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
  });
};

export default AuditLog;
