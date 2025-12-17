'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('groups', 'encryption_key', {
    type: Sequelize.TEXT,
    allowNull: true,
    comment: 'Base64-encoded AES-256 encryption key for group messages (server-side encryption)',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('groups', 'encryption_key');
}
