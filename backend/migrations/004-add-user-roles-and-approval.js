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
  await queryInterface.addColumn('users', 'approvalStatus', {
    type: Sequelize.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false,
  });

  // Add approved by field (references users table)
  await queryInterface.addColumn('users', 'approvedBy', {
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
  await queryInterface.addColumn('users', 'approvedAt', {
    type: Sequelize.DATE,
    allowNull: true,
  });

  // Add rejection reason field
  await queryInterface.addColumn('users', 'rejectionReason', {
    type: Sequelize.TEXT,
    allowNull: true,
  });

  // Add indexes for performance
  await queryInterface.addIndex('users', ['role'], {
    name: 'idx_users_role',
  });

  await queryInterface.addIndex('users', ['approvalStatus'], {
    name: 'idx_users_approval_status',
  });
}

export async function down(queryInterface, Sequelize) {
  // Remove indexes
  await queryInterface.removeIndex('users', 'idx_users_role');
  await queryInterface.removeIndex('users', 'idx_users_approval_status');

  // Remove columns in reverse order
  await queryInterface.removeColumn('users', 'rejectionReason');
  await queryInterface.removeColumn('users', 'approvedAt');
  await queryInterface.removeColumn('users', 'approvedBy');
  await queryInterface.removeColumn('users', 'approvalStatus');
  await queryInterface.removeColumn('users', 'role');

  // Drop the ENUM types if needed
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_approvalStatus";');
}