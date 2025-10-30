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
    passwordHash: {
      type: Sequelize.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    firstName: {
      type: Sequelize.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    lastName: {
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
    emailVerified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    emailVerificationToken: {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
    },
    passwordResetToken: {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
    },
    passwordResetExpires: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    failedLoginAttempts: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
        max: 10,
      },
    },
    lockedUntil: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    lastLoginAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    deletedAt: {
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

  await queryInterface.addIndex('users', ['emailVerified'], {
    name: 'idx_users_email_verified',
  });

  await queryInterface.addIndex('users', ['createdAt'], {
    name: 'idx_users_created_at',
  });

  await queryInterface.addIndex('users', ['lastLoginAt'], {
    name: 'idx_users_last_login_at',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('users');
}