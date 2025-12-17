'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  // Add encryption metadata field
  await queryInterface.addColumn('messages', 'encryption_metadata', {
    type: Sequelize.JSONB,
    allowNull: true,
    comment: 'Encryption metadata: algorithm, nonce, authTag for encrypted messages',
  });

  // Add encryption flag
  await queryInterface.addColumn('messages', 'is_encrypted', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this message is end-to-end encrypted',
  });

  // Add encryption algorithm field
  await queryInterface.addColumn('messages', 'encryption_algorithm', {
    type: Sequelize.STRING(50),
    allowNull: true,
    comment: 'Encryption algorithm used (e.g., x25519-xsalsa20-poly1305, aes-256-gcm)',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('messages', 'encryption_metadata');
  await queryInterface.removeColumn('messages', 'is_encrypted');
  await queryInterface.removeColumn('messages', 'encryption_algorithm');
}