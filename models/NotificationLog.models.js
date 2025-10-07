const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NotificationLog = sequelize.define('NotificationLog', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Payload complet de la notification ou des données d\'événement',
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Message d\'erreur associé, s\'il existe',
    },
  }, {
    tableName: 'notification_logs',
    timestamps: true,
  });

  return NotificationLog;
};