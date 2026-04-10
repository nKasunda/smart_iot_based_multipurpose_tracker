'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Locations"
      ALTER COLUMN "tracker_id" TYPE VARCHAR
      USING "tracker_id"::varchar;
    `);

    await queryInterface.sequelize.query(`
      UPDATE "Locations" AS l
      SET "tracker_id" = t."device_uid"
      FROM "Trackers" AS t
      WHERE l."tracker_id" = t."id"::varchar;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE "Locations" AS l
      SET "tracker_id" = t."id"::varchar
      FROM "Trackers" AS t
      WHERE l."tracker_id" = t."device_uid";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "Locations"
      ALTER COLUMN "tracker_id" TYPE INTEGER
      USING NULLIF("tracker_id", '')::integer;
    `);
  }
};
