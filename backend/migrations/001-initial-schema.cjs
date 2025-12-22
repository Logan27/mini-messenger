'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  async up(queryInterface, Sequelize) {
    const sqlPath = path.join(__dirname, 'sql', 'initial_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }
};
