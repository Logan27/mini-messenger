import { DataTypes } from 'sequelize';

import { sequelize } from '../config/database.js';

export const SystemSetting = sequelize.define(
  'SystemSetting',
  {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'systemSettings',
    underscored: false, // Use camelCase for field names
    timestamps: true,
    paranoid: false, // Override global paranoid setting - system settings don't need soft deletes
  }
);

export default SystemSetting;
