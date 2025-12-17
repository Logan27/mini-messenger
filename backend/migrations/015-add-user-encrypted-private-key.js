'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('users', 'encrypted_private_key', {
    type: Sequelize.TEXT,
    allowNull: true,
    comment: 'Encrypted private key for E2E encryption (libsodium) - encrypted with user password',
  });

  // Add key rotation tracking fields
  await queryInterface.addColumn('users', 'key_version', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Version number for key rotation tracking',
  });

  await queryInterface.addColumn('users', 'last_key_rotation', {
    type: Sequelize.DATE,
    allowNull: true,
    comment: 'Timestamp of last key rotation for security audit',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('users', 'encrypted_private_key');
  await queryInterface.removeColumn('users', 'key_version');
  await queryInterface.removeColumn('users', 'last_key_rotation');
}