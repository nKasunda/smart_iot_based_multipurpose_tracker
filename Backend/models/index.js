'use strict';

const fs = require('fs');   // file system module for reading model files
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

const shouldUseSsl = () => {
  if (process.env.DB_SSL === 'true') return true;
  if (!process.env.DATABASE_URL) return false;

  try {
    const url = new URL(process.env.DATABASE_URL);
    return ['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode'));
  } catch {
    return false;
  }
};

const sslDialectOptions = shouldUseSsl()
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : undefined;

let sequelize;  // initializing Sequelize instance based on config
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: sslDialectOptions
  });
} else if (process.env.DB_NAME || process.env.DB_HOST || process.env.DB_USER || process.env.DB_PASS) {
  sequelize = new Sequelize(
    process.env.DB_NAME || config.database,
    process.env.DB_USER || config.username,
    process.env.DB_PASS || config.password,
    {
      host: process.env.DB_HOST || config.host,
      port: process.env.DB_PORT || config.port,
      dialect: config.dialect || 'postgres',
      logging: false,
      dialectOptions: sslDialectOptions
    }
  );
} else if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Importing all model files in the directory
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Calling associate() on all models to setup relationships
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Adding Sequelize instances to export
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
