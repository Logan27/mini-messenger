'use strict';

export async function up(queryInterface, Sequelize) {
  const tableDescription = await queryInterface.describeTable('users');

  // Add bio column if it doesn't exist
  if (!tableDescription.bio) {
    await queryInterface.addColumn('users', 'bio', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  }

  // Add phone column if it doesn't exist
  if (!tableDescription.phone) {
    await queryInterface.addColumn('users', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  }
}

export async function down(queryInterface, Sequelize) {
  const tableDescription = await queryInterface.describeTable('users');

  if (tableDescription.phone) {
    await queryInterface.removeColumn('users', 'phone');
  }

  if (tableDescription.bio) {
    await queryInterface.removeColumn('users', 'bio');
  }
}
