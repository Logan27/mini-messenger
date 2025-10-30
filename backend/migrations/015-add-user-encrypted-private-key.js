'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('users', 'encryptedPrivateKey', {
    type: Sequelize.TEXT,
    allowNull: true,
    comment: 'Encrypted private key for E2E encryption (libsodium) - encrypted with user password',
  });

  // Add key rotation tracking fields
  await queryInterface.addColumn('users', 'keyVersion', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Version number for key rotation tracking',
  });

  await queryInterface.addColumn('users', 'lastKeyRotation', {
    type: Sequelize.DATE,
    allowNull: true,
    comment: 'Timestamp of last key rotation for security audit',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('users', 'encryptedPrivateKey');
  await queryInterface.removeColumn('users', 'keyVersion');
  await queryInterface.removeColumn('users', 'lastKeyRotation');
}