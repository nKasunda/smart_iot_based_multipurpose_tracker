'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tracker extends Model {
    static associate(models) {
      Tracker.associate = function(models) {    //association with other models
        Tracker.belongsTo(models.User, { foreignKey: 'userId' });
        Tracker.hasMany(models.Location, { foreignKey: 'tracker_id' });
        Tracker.hasMany(models.Alert, { foreignKey: 'tracker_id' });   
        Tracker.hasMany(models.Trip, { foreignKey: 'tracker_id' });    
        Tracker.hasOne(models.Asset, { foreignKey: 'tracker_id' });     
      };
    }
  }

  Tracker.init({
    device_uid: {             //new: hardware device unique ID
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
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
