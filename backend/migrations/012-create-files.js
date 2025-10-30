'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('files', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      uploaderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      messageId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'messages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      filename: {
        type: Sequelize.STRING(255),
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
        type: Sequelize.STRING(255),
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
        type: Sequelize.STRING(500),
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
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: {
            args: 0,
            msg: 'File size cannot be negative',
          },
          max: {
            args: 25 * 1024 * 1024, // 25MB
            msg: 'File size cannot exceed 25MB',
          },
        },
      },
      mimeType: {
        type: Sequelize.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'MIME type is required',
          },
          len: {
            args: [1, 100],
            msg: 'MIME type must be less than 100 characters',
          },
        },
      },
      fileType: {
        type: Sequelize.ENUM('image', 'document', 'video', 'audio'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['image', 'document', 'video', 'audio']],
            msg: 'Invalid file type',
          },
        },
      },
      isImage: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: {
            args: 0,
            msg: 'Width cannot be negative',
          },
        },
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: {
            args: 0,
            msg: 'Height cannot be negative',
          },
        },
      },
      thumbnailPath: {
        type: Sequelize.STRING(500),
        allowNull: true,
        validate: {
          len: {
            args: [0, 500],
            msg: 'Thumbnail path must be less than 500 characters',
          },
        },
      },
      virusScanStatus: {
        type: Sequelize.ENUM('pending', 'scanning', 'clean', 'infected', 'error'),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: {
            args: [['pending', 'scanning', 'clean', 'infected', 'error']],
            msg: 'Invalid virus scan status',
          },
        },
      },
      virusScanResult: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
      },
      downloadCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: 0,
            msg: 'Download count cannot be negative',
          },
        },
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('files', ['uploaderId'], {
      name: 'idx_files_uploader_id',
    });

    await queryInterface.addIndex('files', ['messageId'], {
      name: 'idx_files_message_id',
    });

    await queryInterface.addIndex('files', ['fileType'], {
      name: 'idx_files_type',
    });

    await queryInterface.addIndex('files', ['virusScanStatus'], {
      name: 'idx_files_virus_scan_status',
    });

    await queryInterface.addIndex('files', ['expiresAt'], {
      name: 'idx_files_expires_at',
    });

    await queryInterface.addIndex('files', ['createdAt'], {
      name: 'idx_files_created_at',
    });

    await queryInterface.addIndex('files', ['uploaderId', 'createdAt'], {
      name: 'idx_files_uploader_created_desc',
      order: [['createdAt', 'DESC']],
    });

    await queryInterface.addIndex('files', ['fileSize'], {
      name: 'idx_files_size',
    });

    await queryInterface.addIndex('files', ['mimeType'], {
      name: 'idx_files_mime_type',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('files');
  }
};