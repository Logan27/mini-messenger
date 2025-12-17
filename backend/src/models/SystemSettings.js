import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

/**
 * SystemSettings Model
 * System-wide configuration settings stored as key-value pairs
 */
export const SystemSettings = sequelize.define(
  'SystemSettings',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
      allowNull: false,
    },
    settingKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Setting key is required',
        },
      },
      comment: 'Unique key for the setting',
    },
    settingValue: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Setting value (stored as string, parsed based on dataType)',
    },
    dataType: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
      allowNull: false,
      defaultValue: 'string',
      validate: {
        isIn: {
          args: [['string', 'number', 'boolean', 'json']],
          msg: 'Data type must be string, number, boolean, or json',
        },
      },
      comment: 'Data type for proper parsing of settingValue',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Human-readable description of the setting',
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether this setting is publicly visible (non-sensitive)',
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
    tableName: 'system_settings',
    underscored: true,
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['settingKey'],
        name: 'idx_system_settings_key_unique',
      },
      {
        fields: ['isPublic'],
        name: 'idx_system_settings_public',
      },
      {
        fields: ['dataType'],
        name: 'idx_system_settings_data_type',
      },
    ],
  }
);

// Instance methods
SystemSettings.prototype.getParsedValue = function () {
  if (!this.settingValue) {
    return null;
  }

  switch (this.dataType) {
    case 'number':
      return parseFloat(this.settingValue);
    case 'boolean':
      return this.settingValue === 'true' || this.settingValue === '1';
    case 'json':
      try {
        return JSON.parse(this.settingValue);
      } catch (e) {
        console.error(`Failed to parse JSON for setting ${this.settingKey}:`, e);
        return null;
      }
    case 'string':
    default:
      return this.settingValue;
  }
};

SystemSettings.prototype.setValue = function (value) {
  switch (this.dataType) {
    case 'number':
      this.settingValue = String(value);
      break;
    case 'boolean':
      this.settingValue = value ? 'true' : 'false';
      break;
    case 'json':
      this.settingValue = JSON.stringify(value);
      break;
    case 'string':
    default:
      this.settingValue = String(value);
  }
};

// Static methods
SystemSettings.getSetting = async function (key, defaultValue = null) {
  const setting = await this.findOne({
    where: { settingKey: key },
  });

  if (!setting) {
    return defaultValue;
  }

  return setting.getParsedValue();
};

SystemSettings.setSetting = async function (key, value, dataType = 'string', description = null) {
  const [setting, created] = await this.findOrCreate({
    where: { settingKey: key },
    defaults: {
      settingKey: key,
      dataType,
      description,
      isPublic: false,
    },
  });

  setting.setValue(value);
  setting.dataType = dataType;
  if (description) {
    setting.description = description;
  }

  await setting.save();
  return setting;
};

SystemSettings.getPublicSettings = async function () {
  const settings = await this.findAll({
    where: { isPublic: true },
  });

  return settings.reduce((acc, setting) => {
    acc[setting.settingKey] = setting.getParsedValue();
    return acc;
  }, {});
};

SystemSettings.getAllSettings = async function () {
  const settings = await this.findAll();

  return settings.reduce((acc, setting) => {
    acc[setting.settingKey] = {
      value: setting.getParsedValue(),
      dataType: setting.dataType,
      description: setting.description,
      isPublic: setting.isPublic,
    };
    return acc;
  }, {});
};

SystemSettings.deleteSetting = async function (key) {
  return await this.destroy({
    where: { settingKey: key },
  });
};

// Default settings
SystemSettings.createDefaults = async function () {
  const defaults = [
    {
      settingKey: 'app_name',
      settingValue: 'Messenger',
      dataType: 'string',
      description: 'Application name',
      isPublic: true,
    },
    {
      settingKey: 'max_users',
      settingValue: '100',
      dataType: 'number',
      description: 'Maximum number of registered users',
      isPublic: false,
    },
    {
      settingKey: 'registration_enabled',
      settingValue: 'true',
      dataType: 'boolean',
      description: 'Whether new user registration is allowed',
      isPublic: true,
    },
    {
      settingKey: 'require_email_verification',
      settingValue: 'false',
      dataType: 'boolean',
      description: 'Whether email verification is required for new accounts',
      isPublic: false,
    },
    {
      settingKey: 'message_retention_days',
      settingValue: '30',
      dataType: 'number',
      description: 'Number of days to retain messages before deletion',
      isPublic: false,
    },
    {
      settingKey: 'max_file_size_mb',
      settingValue: '25',
      dataType: 'number',
      description: 'Maximum file upload size in megabytes',
      isPublic: true,
    },
  ];

  for (const setting of defaults) {
    await this.findOrCreate({
      where: { settingKey: setting.settingKey },
      defaults: setting,
    });
  }
};

export default SystemSettings;
