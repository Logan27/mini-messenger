'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('users', 'publicKey', {
    type: Sequelize.TEXT,
    allowNull: true,
    comment: 'Base64-encoded public key for E2E encryption (libsodium)',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('users', 'publicKey');
}
