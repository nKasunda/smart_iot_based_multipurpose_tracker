'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Locations: best-effort, safe when tables/cols don't exist yet
      await queryInterface.sequelize.query(
        `
        DO $$
        BEGIN
          IF to_regclass('public."Locations"') IS NOT NULL THEN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'Locations' AND column_name = 'tracker_id'
            ) THEN
              ALTER TABLE "Locations" RENAME COLUMN "tracker_id" TO "device_id";
            END IF;

            ALTER TABLE "Locations" ADD COLUMN IF NOT EXISTS "speed" DOUBLE PRECISION DEFAULT 0;
            ALTER TABLE "Locations" ADD COLUMN IF NOT EXISTS "battery" INTEGER;
          END IF;
        END $$;
        `,
        { transaction }
      );

      // Trackers skip for now (next migration)
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Locations', 'speed');
    await queryInterface.removeColumn('Locations', 'battery');
    await queryInterface.renameColumn('Locations', 'device_id', 'tracker_id');
    await queryInterface.renameColumn('Trackers', 'device_id', 'trackerId');
    await queryInterface.removeIndex('Locations', ['device_id', 'timestamp']);
  }
};
