'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'termsAcceptedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when user accepted Terms of Service',
    });

    await queryInterface.addColumn('users', 'privacyAcceptedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when user accepted Privacy Policy',
    });

    await queryInterface.addColumn('users', 'termsVersion', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: '1.0',
      comment: 'Version of Terms of Service accepted by user',
    });

    await queryInterface.addColumn('users', 'privacyVersion', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: '1.0',
      comment: 'Version of Privacy Policy accepted by user',
    });

    // Backfill existing users with consent timestamps (set to their creation date)
    await queryInterface.sequelize.query(`
      UPDATE users
      SET
        termsAcceptedAt = createdAt,
        privacyAcceptedAt = createdAt,
        termsVersion = '1.0',
        privacyVersion = '1.0'
      WHERE termsAcceptedAt IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'termsAcceptedAt');
    await queryInterface.removeColumn('users', 'privacyAcceptedAt');
    await queryInterface.removeColumn('users', 'termsVersion');
    await queryInterface.removeColumn('users', 'privacyVersion');
  },
};
