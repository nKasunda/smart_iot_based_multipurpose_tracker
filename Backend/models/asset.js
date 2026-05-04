'use strict';
const { Model } = require('sequelize'); // importing Model class from sequelize

module.exports = (sequelize, DataTypes) => { // exporting a function that defines the Asset model
  class Asset extends Model {
    static associate(models) { // defining associations with other models
      Asset.belongsTo(models.Tracker, { foreignKey: 'tracker_id', targetKey: 'device_uid' });
      Asset.belongsTo(models.User, { foreignKey: 'owner_id' });
    }
  }

  Asset.init({      // defining fields for Asset model
    name: DataTypes.STRING,
    category: DataTypes.STRING,
    description: DataTypes.TEXT,
    tracker_id: { type: DataTypes.STRING, unique: true },
    owner_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Asset',
    indexes: [
      { fields: ['tracker_id'] }  // index for faster queries by tracker_id
    ]
  });

  return Asset;
};