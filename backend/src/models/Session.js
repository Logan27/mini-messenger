import { DataTypes, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

export const Session = sequelize.define(
  'Session',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      validate: {
        notEmpty: {
          msg: 'User ID is required',
        },
      },
    },
    refreshToken: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: {
        name: 'unique_session_refresh_token',
        msg: 'Refresh token already exists',
      },
      validate: {
        notEmpty: {
          msg: 'Refresh token is required',
        },
      },
    },
    deviceInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfter: {
          args: new Date().toISOString(),
          msg: 'Expiration date must be in the future',
        },
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'user_sessions',
    underscored: true, // Use snake_case to match database schema
    timestamps: false, // Disable automatic timestamps
    indexes: [
      {
        unique: true,
        fields: ['refreshToken'],
        name: 'idx_user_sessions_refresh_token',
      },
      {
        fields: ['userId'],
        name: 'idx_user_sessions_user_id',
      },
      {
        fields: ['expiresAt'],
        name: 'idx_user_sessions_expires_at',
      },
    ],
  }
);

// Instance methods
Session.prototype.isExpired = function () {
  return this.expiresAt < new Date();
};

// Static methods

Session.findByRefreshToken = function (refreshToken) {
  return this.findOne({
    where: {
      refreshToken,
      expiresAt: {
        [Op.gt]: new Date(),
      },
    },
  });
};

Session.findValidSessionsByUserId = function (userId) {
  return this.findAll({
    where: {
      userId,
      expiresAt: {
        [Op.gt]: new Date(),
      },
    },
    order: [['created_at', 'DESC']],
  });
};

Session.expireAllUserSessions = function (userId, options = {}) {
  return this.update(
    {
      expiresAt: new Date(),
    },
    {
      where: {
        userId,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
      ...options,
    }
  );
};

Session.cleanupExpiredSessions = function () {
  return this.destroy({
    where: {
      expiresAt: {
        [Op.lt]: new Date(),
      },
    },
  });
};

// Hooks removed - no longer needed

export default Session;
