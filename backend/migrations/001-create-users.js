'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('users', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    username: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 50],
        isAlphanumeric: true,
      },
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
        len: [0, 255],
      },
    },
    password_hash: {
      type: Sequelize.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    first_name: {
      type: Sequelize.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    last_name: {
      type: Sequelize.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    avatar: {
      type: Sequelize.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    status: {
      type: Sequelize.ENUM('online', 'offline', 'away', 'busy'),
      defaultValue: 'offline',
      allowNull: false,
    },
    email_verified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    email_verification_token: {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
    },
    password_reset_token: {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
    },
    password_reset_expires: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    failed_login_attempts: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
        max: 10,
      },
    },
    locked_until: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    last_login_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    deleted_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  // Create indexes for performance
  await queryInterface.addIndex('users', ['username'], {
    name: 'idx_users_username_unique',
    unique: true,
  });

  await queryInterface.addIndex('users', ['email'], {
    name: 'idx_users_email_unique',
    unique: true,
  });

  await queryInterface.addIndex('users', ['status'], {
    name: 'idx_users_status',
  });

  await queryInterface.addIndex('users', ['email_verified'], {
    name: 'idx_users_email_verified',
  });

  await queryInterface.addIndex('users', ['created_at'], {
    name: 'idx_users_created_at',
  });

  await queryInterface.addIndex('users', ['last_login_at'], {
    name: 'idx_users_last_login_at',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('users');
}