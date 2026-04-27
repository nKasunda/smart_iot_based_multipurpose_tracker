'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `
        DO $$
        BEGIN
          IF to_regclass('public."Trackers"') IS NOT NULL THEN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'Trackers' AND column_name = 'trackerId'
            )
            AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'Trackers' AND column_name = 'device_id'
            ) THEN
              ALTER TABLE "Trackers" RENAME COLUMN "trackerId" TO "device_id";
            END IF;

            ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "type" VARCHAR DEFAULT 'unknown';
            ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "status" VARCHAR DEFAULT 'active';
            ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "lastSeen" TIMESTAMPTZ;

            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'Trackers' AND column_name = 'device_id'
            ) THEN
              BEGIN
                ALTER TABLE "Trackers" ADD CONSTRAINT "Trackers_device_id_key" UNIQUE ("device_id");
              EXCEPTION WHEN duplicate_object THEN
                NULL;
              END;
            END IF;
          END IF;
        END $$;
        `,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Trackers" 
      DROP CONSTRAINT IF EXISTS "Trackers_device_id_key";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "Trackers" 
      DROP COLUMN IF EXISTS "lastSeen";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "Trackers" 
      DROP COLUMN IF EXISTS "status";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "Trackers" 
      DROP COLUMN IF EXISTS "type";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "Trackers" 
      RENAME COLUMN "device_id" TO "trackerId";
    `);
  }
};
