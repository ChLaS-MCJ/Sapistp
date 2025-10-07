const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Epci = sequelize.define('Epci', {
        code: {
            type: DataTypes.STRING(50),
            primaryKey: true,
            allowNull: false,
            unique: true,
        },
        nom: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        datedebutpaiment: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        datefinpaiment: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        rib: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        mail1: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        mail2: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        telephone1: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        telephone2: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        responsable_nom1: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        responsable_nom2: {
            type: DataTypes.STRING,
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
        },
    }, {
        tableName: 'epcis',
        paranoid: true,
        timestamps: true,
    });

    return Epci;
};
