'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
<<<<<<< HEAD
    // Add 'timestamp' column to 'Locations' table
    await queryInterface.addColumn('Locations', 'timestamp', {
      type: Sequelize.DATE,
      allowNull: true, // you can set false if you want every row to require it
=======
    const table = await queryInterface.describeTable('Locations').catch(() => null);
    if (!table) return;
    if (table.timestamp) return;

    await queryInterface.addColumn('Locations', 'timestamp', {
      type: Sequelize.DATE,
      allowNull: true
>>>>>>> origin/main
    });
  },

  async down(queryInterface, Sequelize) {
<<<<<<< HEAD
    // Remove 'timestamp' column in case of rollback
    await queryInterface.removeColumn('Locations', 'timestamp');
  }
};
=======
    const table = await queryInterface.describeTable('Locations').catch(() => null);
    if (!table) return;
    if (!table.timestamp) return;

    await queryInterface.removeColumn('Locations', 'timestamp');
  }
};
>>>>>>> origin/main
