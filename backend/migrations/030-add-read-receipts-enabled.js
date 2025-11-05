export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('users', 'readReceiptsEnabled', {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Privacy setting: whether to send read receipts to other users',
  });

  // Add index for readReceiptsEnabled
  await queryInterface.addIndex('users', ['readReceiptsEnabled'], {
    name: 'idx_users_read_receipts_enabled',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeIndex('users', 'idx_users_read_receipts_enabled');
  await queryInterface.removeColumn('users', 'readReceiptsEnabled');
}
