'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('file_uploads', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      uploader_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      message_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'messages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      file_name: {
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
      original_name: {
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
      file_path: {
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
      file_size: {
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
      mime_type: {
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
      file_type: {
        type: Sequelize.ENUM('image', 'document', 'video', 'audio'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['image', 'document', 'video', 'audio']],
            msg: 'Invalid file type',
          },
        },
      },
      is_image: {
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
      thumbnail_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        validate: {
          len: {
            args: [0, 500],
            msg: 'Thumbnail path must be less than 500 characters',
          },
        },
      },
      virus_scan_status: {
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
      virus_scan_result: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
      },
      download_count: {
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
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('file_uploads', ['uploader_id'], {
      name: 'idx_file_uploads_uploader_id',
    });

    await queryInterface.addIndex('file_uploads', ['message_id'], {
      name: 'idx_file_uploads_message_id',
    });

    await queryInterface.addIndex('file_uploads', ['file_type'], {
      name: 'idx_file_uploads_type',
    });

    await queryInterface.addIndex('file_uploads', ['virus_scan_status'], {
      name: 'idx_file_uploads_virus_scan_status',
    });

    await queryInterface.addIndex('file_uploads', ['expires_at'], {
      name: 'idx_file_uploads_expires_at',
    });

    await queryInterface.addIndex('file_uploads', ['created_at'], {
      name: 'idx_file_uploads_created_at',
    });

    await queryInterface.addIndex('file_uploads', ['uploader_id', 'created_at'], {
      name: 'idx_file_uploads_uploader_created_desc',
      order: [['created_at', 'DESC']],
    });

    await queryInterface.addIndex('file_uploads', ['file_size'], {
      name: 'idx_file_uploads_size',
    });

    await queryInterface.addIndex('file_uploads', ['mime_type'], {
      name: 'idx_file_uploads_mime_type',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('file_uploads');
  }
};