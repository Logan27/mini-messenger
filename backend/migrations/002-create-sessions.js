'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('sessions', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      validate: {
        notEmpty: true,
      },
    },
    token: {
      type: Sequelize.STRING(500),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    refreshToken: {
      type: Sequelize.STRING(500),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    ipAddress: {
      type: Sequelize.STRING(45),
      allowNull: true,
      validate: {
        isIP: true,
      },
    },
    userAgent: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: false,
      validate: {
        isAfter: new Date().toISOString(),
      },
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    lastAccessedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  // Create indexes for performance
  await queryInterface.addIndex('sessions', ['token'], {
    name: 'idx_sessions_token_unique',
    unique: true,
  });

  await queryInterface.addIndex('sessions', ['refreshToken'], {
    name: 'idx_sessions_refresh_token_unique',
    unique: true,
  });

  await queryInterface.addIndex('sessions', ['userId'], {
    name: 'idx_sessions_user_id',
  });

  await queryInterface.addIndex('sessions', ['expiresAt'], {
    name: 'idx_sessions_expires_at',
  });

  await queryInterface.addIndex('sessions', ['lastAccessedAt'], {
    name: 'idx_sessions_last_accessed_at',
  });

  await queryInterface.addIndex('sessions', ['createdAt'], {
    name: 'idx_sessions_created_at',
  });

  await queryInterface.addIndex('sessions', ['userId', 'expiresAt'], {
    name: 'idx_sessions_user_expires',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('sessions');
}