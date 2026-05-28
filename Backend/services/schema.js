/**
 * Minimal, idempotent schema alignment for Postgres.
 * Keeps runtime resilient even when migrations weren't executed.
 */

'use strict';

async function ensureSchema(sequelize) {
  // These statements are intentionally conservative: only ADD/RENAME when safe.
  // They should not drop data or enforce constraints that could fail on dirty dev DBs.
  const statements = [
    `
    DO $$
    BEGIN
      IF to_regclass('public."Users"') IS NOT NULL THEN
        ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "settings" JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
        ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "verificationToken" VARCHAR;
        ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "verificationExpiresAt" TIMESTAMPTZ;
        ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "authProvider" VARCHAR DEFAULT 'password';
        ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "googleSub" VARCHAR;

        -- Existing accounts predate email verification and should remain able to sign in.
        UPDATE "Users"
        SET "emailVerified" = true
        WHERE "verificationToken" IS NULL
          AND ("authProvider" IS NULL OR "authProvider" IN ('password', 'password_google'));

        CREATE UNIQUE INDEX IF NOT EXISTS "Users_googleSub_unique_idx"
        ON "Users" ("googleSub")
        WHERE "googleSub" IS NOT NULL;
      END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
      IF to_regclass('public."Trackers"') IS NOT NULL THEN
        -- Legacy renames: trackerId/device_id -> device_uid (only if device_uid missing)
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
        ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "name" VARCHAR;
        ALTER TABLE "Trackers" ADD COLUMN IF NOT EXISTS "imei" VARCHAR;

        -- Enforce IMEI uniqueness when possible (allows multiple NULLs).
        -- If duplicates already exist, skip creating the unique index to avoid startup failure.
        IF NOT EXISTS (
          SELECT 1
          FROM "Trackers"
          WHERE "imei" IS NOT NULL
          GROUP BY "imei"
          HAVING COUNT(*) > 1
          LIMIT 1
        ) THEN
          CREATE UNIQUE INDEX IF NOT EXISTS "Trackers_imei_unique_idx"
          ON "Trackers" ("imei")
          WHERE "imei" IS NOT NULL;
        END IF;
      END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
      IF to_regclass('public."Locations"') IS NOT NULL THEN
        -- Legacy renames: tracker_id/trackerId -> device_id
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

        -- Helpful indexes (won't error if they already exist)
        CREATE INDEX IF NOT EXISTS "Locations_device_id_idx" ON "Locations" ("device_id");
        CREATE INDEX IF NOT EXISTS "Locations_timestamp_idx" ON "Locations" ("timestamp");
      END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
      IF to_regclass('public."Alerts"') IS NOT NULL THEN
        ALTER TABLE "Alerts" ADD COLUMN IF NOT EXISTS "type" VARCHAR;
        ALTER TABLE "Alerts" ADD COLUMN IF NOT EXISTS "message" TEXT;
        ALTER TABLE "Alerts" ADD COLUMN IF NOT EXISTS "severity" VARCHAR;
        ALTER TABLE "Alerts" ADD COLUMN IF NOT EXISTS "isResolved" BOOLEAN DEFAULT false;
        ALTER TABLE "Alerts" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMPTZ;
        ALTER TABLE "Alerts" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "Alerts" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

        CREATE INDEX IF NOT EXISTS "Alerts_tracker_id_idx" ON "Alerts" ("tracker_id");
        CREATE INDEX IF NOT EXISTS "Alerts_createdAt_idx" ON "Alerts" ("createdAt");
      END IF;
    END $$;
    `
  ];

  await sequelize.transaction(async (transaction) => {
    for (const sql of statements) {
      // eslint-disable-next-line no-await-in-loop
      await sequelize.query(sql, { transaction });
    }
  });
}

module.exports = { ensureSchema };
