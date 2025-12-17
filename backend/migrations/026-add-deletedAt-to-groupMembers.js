'use strict';

export async function up(queryInterface, Sequelize) {
  // Check if deleted_at column exists before adding
  const tableDescription = await queryInterface.describeTable('group_members');

  if (!tableDescription.deleted_at) {
    await queryInterface.addColumn('group_members', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }
}

export async function down(queryInterface, Sequelize) {
  const tableDescription = await queryInterface.describeTable('group_members');

  if (tableDescription.deleted_at) {
    await queryInterface.removeColumn('group_members', 'deleted_at');
  }
}
