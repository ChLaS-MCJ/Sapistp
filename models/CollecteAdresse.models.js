const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CollecteAdresse = sequelize.define('CollecteAdresse', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        categorie: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        insee: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        rivoli: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        jour: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        frequence: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        startMonth: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: null,
        },
        endMonth: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: null,
        },
        report: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
        },
		authkeytelreport: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: null,
        },
		authkeytelcollecte: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: null,
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
        }
		
    }, {
        tableName: 'collecteadresse',
        timestamps: true,
    });

    return CollecteAdresse;
};
