'use strict';
const { Model } = require('sequelize'); // importing Model class from sequelize

module.exports = (sequelize, DataTypes) => {
  class Alert extends Model {
    static associate(models) { // assosciations with other models
      Alert.belongsTo(models.Tracker, { foreignKey: 'tracker_id', targetKey: 'id' });
    }
  }

  Alert.init({ // defining fields for Alert model
    tracker_id: { type: DataTypes.INTEGER, allowNull: false },
    type: DataTypes.STRING,
    message: DataTypes.TEXT,
    severity: DataTypes.STRING,
    isResolved: { type: DataTypes.BOOLEAN, defaultValue: false },
    resolvedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Alert',
    indexes: [
      { fields: ['tracker_id'] }   // index for faster queries by tracker_id
    ]
  });

  return Alert;
};
