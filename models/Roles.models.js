/**
 * Creates a model for the "Role" table in the database using the Sequelize library.
 * The "Role" table has a single column called "name_roles" of type STRING, which is not allowed to be null and must be unique.
 * The model is configured to enable soft deletion (paranoid mode).
 * @param {object} sequelize - The Sequelize object used to connect to the database.
 * @returns {object} - The created Role model.
 */
const rolesModel = (sequelize) => {
  const { DataTypes } = require('sequelize');

  return sequelize.define('Role', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name_roles: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  }, {
    paranoid: true,
    tableName: 'roles',
    timestamps: true,
  });
};

module.exports = rolesModel;
