const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Tarification = sequelize.define('EpciTarification', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        minCommuneCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        maxCommuneCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        price: {
            type: DataTypes.FLOAT,
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
        tableName: 'epcitarifications',
        timestamps: true,
    });

    return Tarification;
};
