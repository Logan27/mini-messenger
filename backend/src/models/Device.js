import { DataTypes, UUIDV4 } from 'sequelize';

import { sequelize } from '../config/database.js';

import User from './User.js';

export const Device = sequelize.define(
  'Device',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: 'devices',
    underscored: false, // Use camelCase for field names
    timestamps: true,
  }
);

Device.belongsTo(User, { as: 'user', foreignKey: 'userId' });

export default Device;
