/**
 * Creates a model for the "PubModel" table in the database using the Sequelize library.
 * The "PubModel" table has columns for:
 * The model is configured to enable soft deletion (paranoid mode).
 * @param {object} sequelize - The Sequelize object used to connect to the database.
 * @returns {object} - The created PubModel model.
 */
const PubModel = (sequelize) => {
    const { DataTypes } = require('sequelize');

    return sequelize.define('Pub', {
        id: {
            type: DataTypes.INTEGER(10),
            primaryKey: true,
            autoIncrement: true
        },
        pub_image: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        pub_link: {
            type: DataTypes.STRING(255),
            allowNull: true,
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
        tableName: 'pubs',
        timestamps: true,
    });


};

module.exports = PubModel;
