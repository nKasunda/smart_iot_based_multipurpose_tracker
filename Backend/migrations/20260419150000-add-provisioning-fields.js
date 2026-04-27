'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Add name column for custom device names
      await queryInterface.addColumn('Trackers', 'name', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
        transaction
      }).catch(err => {
        if (!err.message.includes('already exists')) throw err;
      });

      // Add imei column for cellular device identification
      await queryInterface.addColumn('Trackers', 'imei', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false,
        transaction
      }).catch(err => {
        if (!err.message.includes('already exists')) throw err;
      });

      // Ensure status column exists with proper enum values
      await queryInterface.sequelize.query(
        `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'Trackers' AND column_name = 'status'
          ) THEN
            ALTER TABLE "Trackers" ADD COLUMN "status" VARCHAR DEFAULT 'active';
          END IF;
        END $$;
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Remove columns if they exist
      await queryInterface.removeColumn('Trackers', 'name', { transaction })
        .catch(err => {
          if (!err.message.includes('does not exist')) throw err;
        });

      await queryInterface.removeColumn('Trackers', 'imei', { transaction })
        .catch(err => {
          if (!err.message.includes('does not exist')) throw err;
        });
    });
  }
};
