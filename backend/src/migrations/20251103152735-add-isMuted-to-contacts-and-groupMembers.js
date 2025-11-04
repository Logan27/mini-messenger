export async function up(queryInterface, Sequelize) {
  // Add isMuted column to contacts table
  await queryInterface.addColumn('contacts', 'isMuted', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  // Add isMuted column to groupMembers table
  await queryInterface.addColumn('groupMembers', 'isMuted', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
}

export async function down(queryInterface, Sequelize) {
  // Remove isMuted column from contacts table
  await queryInterface.removeColumn('contacts', 'isMuted');

  // Remove isMuted column from groupMembers table
  await queryInterface.removeColumn('groupMembers', 'isMuted');
}
