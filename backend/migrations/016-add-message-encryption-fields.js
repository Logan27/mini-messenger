'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  // Add encryption metadata field
  await queryInterface.addColumn('messages', 'encryptionMetadata', {
    type: Sequelize.JSONB,
    allowNull: true,
    comment: 'Encryption metadata: algorithm, nonce, authTag for encrypted messages',
  });

  // Add encryption flag
  await queryInterface.addColumn('messages', 'isEncrypted', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this message is end-to-end encrypted',
  });

  // Add encryption algorithm field
  await queryInterface.addColumn('messages', 'encryptionAlgorithm', {
    type: Sequelize.STRING(50),
    allowNull: true,
    comment: 'Encryption algorithm used (e.g., x25519-xsalsa20-poly1305, aes-256-gcm)',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('messages', 'encryptionMetadata');
  await queryInterface.removeColumn('messages', 'isEncrypted');
  await queryInterface.removeColumn('messages', 'encryptionAlgorithm');
}