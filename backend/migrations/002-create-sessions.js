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
    user_id: {
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
    refresh_token: {
      type: Sequelize.STRING(500),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    ip_address: {
      type: Sequelize.STRING(45),
      allowNull: true,
      validate: {
        isIP: true,
      },
    },
    user_agent: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    expires_at: {
      type: Sequelize.DATE,
      allowNull: false,
      validate: {
        isAfter: new Date().toISOString(),
      },
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    last_accessed_at: {
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

  await queryInterface.addIndex('sessions', ['refresh_token'], {
    name: 'idx_sessions_refresh_token_unique',
    unique: true,
  });

  await queryInterface.addIndex('sessions', ['user_id'], {
    name: 'idx_sessions_user_id',
  });

  await queryInterface.addIndex('sessions', ['expires_at'], {
    name: 'idx_sessions_expires_at',
  });

  await queryInterface.addIndex('sessions', ['last_accessed_at'], {
    name: 'idx_sessions_last_accessed_at',
  });

  await queryInterface.addIndex('sessions', ['created_at'], {
    name: 'idx_sessions_created_at',
  });

  await queryInterface.addIndex('sessions', ['user_id', 'expires_at'], {
    name: 'idx_sessions_user_expires',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('sessions');
}