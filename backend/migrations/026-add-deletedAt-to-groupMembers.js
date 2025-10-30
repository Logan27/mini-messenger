'use strict';

export async function up(queryInterface, Sequelize) {
  // Check if deletedAt column exists before adding
  const tableDescription = await queryInterface.describeTable('groupMembers');

  if (!tableDescription.deletedAt) {
    await queryInterface.addColumn('groupMembers', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }
}

export async function down(queryInterface, Sequelize) {
  const tableDescription = await queryInterface.describeTable('groupMembers');

  if (tableDescription.deletedAt) {
    await queryInterface.removeColumn('groupMembers', 'deletedAt');
  }
}
