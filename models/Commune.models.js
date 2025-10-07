const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Commune = sequelize.define('Commune', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        code_commune_INSEE: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        nom_commune_postal: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        code_postal: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        code_departement: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        code_region: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        population_commune: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        codeEpci: {
            type: DataTypes.STRING(50),
            allowNull: false,
            references: {
                model: 'epcis',
                key: 'code',
            },
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
        tableName: 'communes',
        paranoid: true,
        timestamps: true,
        indexes: [
            {
                fields: ['code_commune_INSEE']
            }
        ]
    });

    return Commune;
};
