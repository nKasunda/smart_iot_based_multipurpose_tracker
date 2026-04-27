'use strict';
const { Model } = require('sequelize');  // importing Model class from sequelize

module.exports = (sequelize, DataTypes) => { // exporting a function that defines the Trip model
  class Trip extends Model {
    static associate(models) { // defining associations with other models
      Trip.belongsTo(models.Tracker, { foreignKey: 'tracker_id', targetKey: 'device_uid' });
      Trip.hasMany(models.Location, { foreignKey: 'trip_id' });
    }
  }

  Trip.init({ //    defining fields for Trip model
    tracker_id: { type: DataTypes.STRING, allowNull: false },
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE,
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    distance: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'Trip',
    indexes: [
      { fields: ['tracker_id'] } // index for faster queries by tracker_id
    ]
  });

  return Trip;
};