'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
<<<<<<< HEAD
    await queryInterface.sequelize.query(`
      ALTER TABLE "Locations"
      ALTER COLUMN "tracker_id" TYPE VARCHAR
      USING "tracker_id"::varchar;
    `);

    await queryInterface.sequelize.query(`
=======
    const table = await queryInterface.describeTable('Locations').catch(() => null);
    if (!table || !table.tracker_id) return;

    await queryInterface.sequelize.query(
      `
      ALTER TABLE "Locations"
      ALTER COLUMN "tracker_id" TYPE VARCHAR
      USING "tracker_id"::varchar;
      `
    );

    await queryInterface.sequelize.query(
      `
>>>>>>> origin/main
      UPDATE "Locations" AS l
      SET "tracker_id" = t."device_uid"
      FROM "Trackers" AS t
      WHERE l."tracker_id" = t."id"::varchar;
<<<<<<< HEAD
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
=======
      `
    );
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Locations').catch(() => null);
    if (!table || !table.tracker_id) return;

    await queryInterface.sequelize.query(
      `
>>>>>>> origin/main
      UPDATE "Locations" AS l
      SET "tracker_id" = t."id"::varchar
      FROM "Trackers" AS t
      WHERE l."tracker_id" = t."device_uid";
<<<<<<< HEAD
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "Locations"
      ALTER COLUMN "tracker_id" TYPE INTEGER
      USING NULLIF("tracker_id", '')::integer;
    `);
=======
      `
    );

    await queryInterface.sequelize.query(
      `
      ALTER TABLE "Locations"
      ALTER COLUMN "tracker_id" TYPE INTEGER
      USING NULLIF("tracker_id", '')::integer;
      `
    );
>>>>>>> origin/main
  }
};
