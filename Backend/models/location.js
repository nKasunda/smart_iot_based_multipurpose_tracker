'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Location extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Location.associate = function(models) {   // defining association with other models
        Location.belongsTo(models.Tracker, { foreignKey: 'tracker_id', targetKey: 'device_uid' });
        Location.belongsTo(models.Trip, { foreignKey: 'trip_id' });  // optional
      };
    }
  }
  Location.init({
    tracker_id: {                   //matching Tracker.device_uid
      type: DataTypes.STRING,
      allowNull: false
  },
  
    lat: DataTypes.FLOAT,
    lng: DataTypes.FLOAT,
    recorded_at: DataTypes.DATE,    // renamed
    heading: DataTypes.FLOAT,
    altitude: DataTypes.FLOAT,
    accuracy: DataTypes.FLOAT,
}, {
   sequelize,
   modelName: 'Location',
  });
  return Location
}