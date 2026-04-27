'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tracker extends Model {
    static associate(models) {
      Tracker.hasMany(models.Location, {
        foreignKey: 'device_id',
        sourceKey: 'device_uid',
        as: 'locations'
      });

      Tracker.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

    }
  }

  Tracker.init({
    device_uid: {
      type: DataTypes.STRING,
      primaryKey: false,
      unique: true,
      allowNull: false
    },
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    imei: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'unknown'
    },
    assigned: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active'
    },
    lastSeen: DataTypes.DATE,
    battery: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    signalStrength: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    network: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Tracker',
    timestamps: true
  });

  return Tracker;
};
