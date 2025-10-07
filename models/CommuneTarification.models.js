const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CommuneTarification = sequelize.define('CommuneTarification', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        minPopulation: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        maxPopulation: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        price: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        nbannonce: {
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
        tableName: 'communetarifications',
        timestamps: true,
    });

    return CommuneTarification;
};
