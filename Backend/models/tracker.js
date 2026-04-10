'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tracker extends Model {
    static associate(models) {
      Tracker.hasMany(models.Location, {
        foreignKey: 'tracker_id',
        sourceKey: 'device_uid',
      });
    }
  }

  Tracker.init({
    device_uid: { type: DataTypes.STRING, allowNull: false, unique: true },
    lastSeen: DataTypes.DATE
  }, { sequelize, modelName: 'Tracker' });

  return Tracker;
};
