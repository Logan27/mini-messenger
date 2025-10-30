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
    token: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: {
        name: 'unique_session_token',
        msg: 'Session token already exists',
      },
      validate: {
        notEmpty: {
          msg: 'Token is required',
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
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      validate: {
        isIP: {
          msg: 'Please provide a valid IP address',
        },
      },
    },
    userAgent: {
      type: DataTypes.TEXT,
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
      defaultValue: DataTypes.NOW, // Add default value since timestamps are disabled
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'sessions',
    underscored: false, // Use camelCase to match existing database schema
    timestamps: false, // Disable automatic timestamps since they don't exist in DB
    indexes: [
      {
        unique: true,
        fields: ['token'],
        name: 'idx_sessions_token_unique',
      },
      {
        unique: true,
        fields: ['refreshToken'],
        name: 'idx_sessions_refresh_token_unique',
      },
      {
        fields: ['userId'],
        name: 'idx_sessions_user_id',
      },
      {
        fields: ['expiresAt'],
        name: 'idx_sessions_expires_at',
      },
      {
        fields: ['lastAccessedAt'],
        name: 'idx_sessions_last_accessed_at',
      },
      {
        fields: ['createdAt'],
        name: 'idx_sessions_created_at',
      },
      {
        fields: ['userId', 'expiresAt'],
        name: 'idx_sessions_user_expires',
      },
    ],
  }
);

// Instance methods
Session.prototype.isExpired = function () {
  return this.expiresAt < new Date();
};

Session.prototype.updateLastAccessed = async function () {
  this.lastAccessedAt = new Date();
  await this.save();
};

Session.prototype.updateActivity = async function () {
  this.lastAccessedAt = new Date();
  await this.save();
};

Session.prototype.isInactive = function (timeoutMinutes = 30) {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  return new Date() - this.lastAccessedAt > timeoutMs;
};

Session.expireInactiveSessions = function (timeoutMinutes = 30) {
  const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);
  return this.update(
    {
      expiresAt: new Date(),
    },
    {
      where: {
        lastAccessedAt: {
          [Op.lt]: timeoutDate,
        },
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    }
  );
};

// Static methods
Session.findByToken = function (token) {
  return this.findOne({
    where: {
      token,
      expiresAt: {
        [Op.gt]: new Date(),
      },
    },
  });
};

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
    order: [['lastAccessedAt', 'DESC']],
  });
};

Session.expireAllUserSessions = function (userId) {
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

// Hooks
Session.beforeCreate(session => {
  if (!session.lastAccessedAt) {
    session.lastAccessedAt = new Date();
  }
});

export default Session;
