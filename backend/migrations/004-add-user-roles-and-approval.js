'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  // Add role field
  await queryInterface.addColumn('users', 'role', {
    type: Sequelize.ENUM('user', 'admin', 'moderator'),
    defaultValue: 'user',
    allowNull: false,
  });

  // Add approval status field
  await queryInterface.addColumn('users', 'approval_status', {
    type: Sequelize.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false,
  });

  // Add approved by field (references users table)
  await queryInterface.addColumn('users', 'approved_by', {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  // Add approved at timestamp
  await queryInterface.addColumn('users', 'approved_at', {
    type: Sequelize.DATE,
    allowNull: true,
  });

  // Add rejection reason field
  await queryInterface.addColumn('users', 'rejection_reason', {
    type: Sequelize.TEXT,
    allowNull: true,
  });

  // Add indexes for performance
  await queryInterface.addIndex('users', ['role'], {
    name: 'idx_users_role',
  });

  await queryInterface.addIndex('users', ['approval_status'], {
    name: 'idx_users_approval_status',
  });
}

export async function down(queryInterface, Sequelize) {
  // Remove indexes
  await queryInterface.removeIndex('users', 'idx_users_role');
  await queryInterface.removeIndex('users', 'idx_users_approval_status');

  // Remove columns in reverse order
  await queryInterface.removeColumn('users', 'rejection_reason');
  await queryInterface.removeColumn('users', 'approved_at');
  await queryInterface.removeColumn('users', 'approved_by');
  await queryInterface.removeColumn('users', 'approval_status');
  await queryInterface.removeColumn('users', 'role');

  // Drop the ENUM types if needed
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_approval_status";');
}