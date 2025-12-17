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
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who performed the action (null for system actions)',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Action type (e.g., user_login, user_deactivate, message_delete)',
    },
    resource: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Type of resource affected (user, message, file, etc.)',
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of the affected resource',
    },
    oldValues: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Previous values before the change',
    },
    newValues: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'New values after the change',
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'audit_log',
    underscored: true, // Use snake_case to match database schema
    timestamps: false, // Only createdAt, no updatedAt
    indexes: [
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['resource'] },
      { fields: ['created_at'] },
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
