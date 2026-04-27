'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Trackers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
     trackerId: {
       type: Sequelize.STRING,
       allowNull: false,
       unique: true, // dd uniqueness here
      },
      assigned: {
        type: Sequelize.BOOLEAN
      },
      userId: {
        type: Sequelize.INTEGER
      },
      battery: {
        type: Sequelize.INTEGER
      },
      signalStrength: {
        type: Sequelize.INTEGER
      },
      network: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.STRING
      },
      lastSeen: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Trackers');
  }
};