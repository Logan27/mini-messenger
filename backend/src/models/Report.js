import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

/**
 * Report Model
 * User reports for inappropriate content or behavior
 */
const Report = sequelize.define(
  'Report',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'User who submitted the report',
    },
    reportedUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reported user (if reporting a user)',
    },
    reportedMessageId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reported message (if reporting a message)',
    },
    reportedFileId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reported file (if reporting a file)',
    },
    reportType: {
      type: DataTypes.ENUM('user', 'message', 'file', 'other'),
      allowNull: false,
      defaultValue: 'user',
      comment: 'Type of report',
    },
    reason: {
      type: DataTypes.ENUM(
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
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Detailed description of the issue',
    },
    evidence: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Evidence (screenshots, links, etc.)',
    },
    status: {
      type: DataTypes.ENUM('pending', 'investigating', 'resolved', 'dismissed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Status of the report',
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Admin who reviewed the report',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the report was reviewed',
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Resolution notes from admin',
    },
    actionTaken: {
      type: DataTypes.ENUM(
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'reports',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['reporterId'] },
      { fields: ['reportedUserId'] },
      { fields: ['reportedMessageId'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
      { fields: ['reviewedBy'] },
      { fields: ['reason'] },
    ],
    paranoid: false,
  }
);

// Associations
Report.associate = models => {
  Report.belongsTo(models.User, {
    foreignKey: 'reporterId',
    as: 'reporter',
  });

  Report.belongsTo(models.User, {
    foreignKey: 'reportedUserId',
    as: 'reportedUser',
  });

  Report.belongsTo(models.Message, {
    foreignKey: 'reportedMessageId',
    as: 'reportedMessage',
  });

  Report.belongsTo(models.File, {
    foreignKey: 'reportedFileId',
    as: 'reportedFile',
  });

  Report.belongsTo(models.User, {
    foreignKey: 'reviewedBy',
    as: 'reviewer',
  });
};

export default Report;
