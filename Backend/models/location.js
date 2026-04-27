'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Location extends Model {
    static associate(models) {
      Location.belongsTo(models.Tracker, {
        foreignKey: 'device_id',
        targetKey: 'device_uid',
        as: 'tracker'
      });

    }
  }

  Location.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    device_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Trackers',
        key: 'device_uid'
      }
    },
    trip_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    lat: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    lng: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    speed: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    battery: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Location',
    timestamps: true,
    indexes: [
      { fields: ['device_id'] },
      { fields: ['timestamp'] }
    ]
  });

  return Location;
};
