'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Location extends Model {
    static associate(models) {
      Location.belongsTo(models.Tracker, {
        foreignKey: 'tracker_id',
        targetKey: 'device_uid',
      });
    }
  }

  Location.init({
    tracker_id: DataTypes.STRING,
    lat: DataTypes.FLOAT,
    lng: DataTypes.FLOAT,
    timestamp: DataTypes.DATE
  }, { sequelize, modelName: 'Location' });

  return Location;
};
