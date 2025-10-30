'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('system_settings', {
    key: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
    },
    value: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  // Add default settings
  await queryInterface.bulkInsert('system_settings', [
    { key: 'messageRetentionDays', value: '30', createdAt: new Date(), updatedAt: new Date() },
    { key: 'maxFileSize', value: '26214400', createdAt: new Date(), updatedAt: new Date() }, // 25MB
    { key: 'maxGroupSize', value: '100', createdAt: new Date(), updatedAt: new Date() },
    { key: 'registrationApproval', value: 'manual', createdAt: new Date(), updatedAt: new Date() },
    { key: 'maintenanceMode', value: 'false', createdAt: new Date(), updatedAt: new Date() },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('system_settings');
}
