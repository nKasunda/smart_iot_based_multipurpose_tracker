'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        DO $$
        BEGIN
          IF to_regclass('public."Trackers"') IS NOT NULL THEN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'Trackers' AND column_name = 'device_uid'
            ) THEN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Trackers' AND column_name = 'trackerId'
              ) THEN
                ALTER TABLE "Trackers" RENAME COLUMN "trackerId" TO "device_uid";
              ELSIF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Trackers' AND column_name = 'device_id'
              ) THEN
                ALTER TABLE "Trackers" RENAME COLUMN "device_id" TO "device_uid";
              END IF;
            END IF;

            ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "type" VARCHAR DEFAULT 'unknown';
            ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "assigned" BOOLEAN;
            ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "userId" INTEGER;
            ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "organization_id" INTEGER;
            ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "signalStrength" INTEGER;
            ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "network" VARCHAR;
            ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "battery" INTEGER;
            ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "lastSeen" TIMESTAMPTZ;
          END IF;
        END $$;
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
        DO $$
        BEGIN
          IF to_regclass('public."Locations"') IS NOT NULL THEN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'Locations' AND column_name = 'device_id'
            ) THEN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Locations' AND column_name = 'tracker_id'
              ) THEN
                ALTER TABLE "Locations" RENAME COLUMN "tracker_id" TO "device_id";
              ELSIF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Locations' AND column_name = 'trackerId'
              ) THEN
                ALTER TABLE "Locations" RENAME COLUMN "trackerId" TO "device_id";
              END IF;
            END IF;

            ALTER TABLE "Locations" ADD COLUMN IF NOT EXISTS "speed" DOUBLE PRECISION DEFAULT 0;
            ALTER TABLE "Locations" ADD COLUMN IF NOT EXISTS "battery" INTEGER;
            ALTER TABLE "Locations" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ;

            CREATE INDEX IF NOT EXISTS "Locations_device_id_idx" ON "Locations" ("device_id");
            CREATE INDEX IF NOT EXISTS "Locations_timestamp_idx" ON "Locations" ("timestamp");
          END IF;
        END $$;
        `,
        { transaction }
      );
    });
  },

  async down() {
    // Intentionally no-op: this migration is meant to be safe on existing DBs.
  }
};
