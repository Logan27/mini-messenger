import { DataTypes, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

export const PasswordHistory = sequelize.define(
  'PasswordHistory',
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
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Password hash is required',
        },
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'passwordHistory',
    underscored: false, // Use camelCase for field names
    timestamps: true, // Enable createdAt and updatedAt
    paranoid: true, // Enable soft deletes (deletedAt)
    indexes: [
      {
        fields: ['userId'],
        name: 'idx_password_history_user_id',
      },
      {
        fields: ['userId', 'createdAt'],
        name: 'idx_password_history_user_created',
      },
    ],
  }
);

// Static methods
PasswordHistory.addPasswordToHistory = async function (userId, passwordHash) {
  // Add current password to history
  await this.create({
    userId,
    passwordHash,
  });

  // Keep only last 3 passwords in history
  const passwords = await this.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: 3,
  });

  if (passwords.length > 3) {
    const toDelete = passwords.slice(3);
    await this.destroy({
      where: {
        id: {
          [Op.in]: toDelete.map(p => p.id),
        },
      },
    });
  }
};

PasswordHistory.checkPasswordNotInHistory = async function (userId, passwordHash) {
  const passwords = await this.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: 3,
  });

  for (const passwordRecord of passwords) {
    const { default: bcrypt } = await import('bcryptjs');
    const isSamePassword = await bcrypt.compare(passwordHash, passwordRecord.passwordHash);
    if (isSamePassword) {
      return false; // Password found in history
    }
  }

  return true; // Password not in history
};

PasswordHistory.getUserPasswordHistory = function (userId) {
  return this.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: 3,
  });
};

export default PasswordHistory;
