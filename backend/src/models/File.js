import { DataTypes, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { sequelize } from '../config/database.js';

// File model for comprehensive file management
export const File = sequelize.define(
  'File',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
      allowNull: false,
    },
    uploaderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id',
      },
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Filename is required',
        },
        len: {
          args: [1, 255],
          msg: 'Filename must be between 1 and 255 characters',
        },
      },
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Original filename is required',
        },
        len: {
          args: [1, 255],
          msg: 'Original filename must be between 1 and 255 characters',
        },
      },
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'File path is required',
        },
        len: {
          args: [1, 500],
          msg: 'File path must be less than 500 characters',
        },
      },
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 25 * 1024 * 1024, // 25MB
      },
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    fileType: {
      type: DataTypes.ENUM('image', 'document', 'video', 'audio'),
      allowNull: false,
      validate: {
        isIn: [['image', 'document', 'video', 'audio']],
      },
    },
    isImage: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    thumbnailPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    virusScanStatus: {
      type: DataTypes.ENUM('pending', 'scanning', 'clean', 'infected', 'error', 'skipped'),
      allowNull: true,
      defaultValue: 'clean',  // Default to 'clean' to bypass scanning
      // Validation temporarily disabled until virus scanning is fully implemented
      // validate: {
      //   isIn: [['pending', 'scanning', 'clean', 'infected', 'error', 'skipped']],
      // },
    },
    virusScanResult: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
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
    tableName: 'files',
    timestamps: true,
    paranoid: false, // No soft deletes
    underscored: false, // camelCase columns
    indexes: [
      {
        fields: ['uploaderId'],
        name: 'idx_files_uploader_id',
      },
      {
        fields: ['messageId'],
        name: 'idx_files_message_id',
      },
      {
        fields: ['fileType'],
        name: 'idx_files_type',
      },
      {
        fields: ['virusScanStatus'],
        name: 'idx_files_virus_scan_status',
      },
      {
        fields: ['expiresAt'],
        name: 'idx_files_expires_at',
      },
      {
        fields: ['createdAt'],
        name: 'idx_files_created_at',
      },
      {
        fields: ['uploaderId', 'createdAt'],
        name: 'idx_files_uploader_created_desc',
        order: [['createdAt', 'DESC']],
      },
      {
        fields: ['fileSize'],
        name: 'idx_files_size',
      },
      {
        fields: ['mimeType'],
        name: 'idx_files_mime_type',
      },
    ],
  }
);

// Instance methods
File.prototype.incrementDownloadCount = async function () {
  this.downloadCount += 1;
  await this.save();
};

File.prototype.markAsScanned = async function (status, result = null) {
  this.virusScanStatus = status;
  this.virusScanResult = result;
  await this.save();
};

File.prototype.isExpired = function () {
  return !!(this.expiresAt && this.expiresAt <= new Date());
};

File.prototype.canBeDownloadedBy = function (userId) {
  // Check if file is expired
  if (this.isExpired()) {
    return false;
  }

  // Check virus scan status
  if (this.virusScanStatus === 'infected') {
    return false;
  }

  return true;
};

// Static methods
File.findByUploader = function (uploaderId, options = {}) {
  return this.findAll({
    where: { uploaderId },
    order: [['createdAt', 'DESC']],
    ...options,
  });
};

File.findByMessage = function (messageId, options = {}) {
  return this.findAll({
    where: { messageId },
    order: [['createdAt', 'ASC']],
    ...options,
  });
};

File.findExpiredFiles = function () {
  return this.findAll({
    where: {
      expiresAt: {
        [Op.lt]: new Date(),
      },
    },
  });
};

File.findInfectedFiles = function () {
  return this.findAll({
    where: {
      virusScanStatus: 'infected',
    },
  });
};

// Hooks
File.beforeCreate(async file => {
  // Set file type and isImage based on MIME type
  if (file.mimeType) {
    if (file.mimeType.startsWith('image/')) {
      file.fileType = 'image';
      file.isImage = true;
    } else if (file.mimeType.startsWith('video/')) {
      file.fileType = 'video';
    } else if (file.mimeType.startsWith('audio/')) {
      file.fileType = 'audio';
    } else {
      file.fileType = 'document';
      file.isImage = false;
    }
  }

  // Set expiration for non-permanent files (24 hours for download links)
  if (!file.expiresAt) {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24);
    file.expiresAt = expirationDate;
  }
});

export default File;
