import { DataTypes, UUIDV4 } from 'sequelize';

import { sequelize } from '../config/database.js';

import User from './User.js';

const Call = sequelize.define(
  'Call',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    callerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    callType: {
      type: DataTypes.ENUM('audio', 'video'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('calling', 'connected', 'ended', 'rejected', 'missed'),
      allowNull: false,
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'durationSeconds', // Explicit field mapping
    },
    startedAt: {
      type: DataTypes.DATE,
    },
    endedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: 'calls',
    underscored: false, // Use camelCase for field names
    timestamps: true, // Enable timestamps
    createdAt: 'createdAt', // Use createdAt column
    updatedAt: false, // Disable updatedAt - column doesn't exist in DB
    indexes: [
      {
        fields: ['callerId', 'createdAt'],
      },
      {
        fields: ['recipientId', 'createdAt'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

Call.belongsTo(User, { as: 'caller', foreignKey: 'callerId' });
Call.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });

export default Call;
