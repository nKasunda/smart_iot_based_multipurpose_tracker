'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tracker extends Model {
    static associate(models) {
      // Tracker belongs to a User
      Tracker.belongsTo(models.User, { foreignKey: 'userId' });

      // Tracker has many Locations (location history)
      Tracker.hasMany(models.Location, { foreignKey: 'trackerId' });
    }
  }

  Tracker.init({
    trackerId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // ✅ enforce uniqueness so upsert works
    },
    assigned: DataTypes.BOOLEAN,
    userId: DataTypes.INTEGER,
    battery: DataTypes.INTEGER,
    signalStrength: DataTypes.INTEGER,
    network: DataTypes.STRING,
    status: DataTypes.STRING,
    lastSeen: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Tracker',
  });

  return Tracker;
};
