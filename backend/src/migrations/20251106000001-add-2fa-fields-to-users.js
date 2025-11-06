'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'twoFactorSecret', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Base32-encoded secret for TOTP two-factor authentication',
    });

    await queryInterface.addColumn('users', 'twoFactorEnabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether two-factor authentication is enabled',
    });

    await queryInterface.addColumn('users', 'twoFactorBackupCodes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON array of hashed backup codes for 2FA recovery',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'twoFactorSecret');
    await queryInterface.removeColumn('users', 'twoFactorEnabled');
    await queryInterface.removeColumn('users', 'twoFactorBackupCodes');
  },
};
