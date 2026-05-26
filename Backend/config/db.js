const { Sequelize } = require("sequelize");
require("dotenv").config();

const shouldUseSsl = () => {
  if (process.env.DB_SSL === "true") return true;
  if (!process.env.DATABASE_URL) return false;

  try {
    const url = new URL(process.env.DATABASE_URL);
    return ["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode"));
  } catch {
    return false;
  }
};

const commonOptions = {
  dialect: "postgres",
  logging: false,
  dialectOptions: shouldUseSsl()
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : undefined,
};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, commonOptions)
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        ...commonOptions,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
      }
    );

module.exports = sequelize;
