'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Locations').catch(() => null);
    if (!table) return;
    if (table.timestamp) return;

    await queryInterface.addColumn('Locations', 'timestamp', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Locations').catch(() => null);
    if (!table) return;
    if (!table.timestamp) return;

    await queryInterface.removeColumn('Locations', 'timestamp');
  }
};
