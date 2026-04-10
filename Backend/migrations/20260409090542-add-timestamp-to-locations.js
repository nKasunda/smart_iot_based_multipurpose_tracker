'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'timestamp' column to 'Locations' table
    await queryInterface.addColumn('Locations', 'timestamp', {
      type: Sequelize.DATE,
      allowNull: true, // you can set false if you want every row to require it
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove 'timestamp' column in case of rollback
    await queryInterface.removeColumn('Locations', 'timestamp');
  }
};