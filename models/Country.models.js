const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Country = sequelize.define('Country', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        alpha2: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        alpha3: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        nom_en_gb: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        nom_fr_fr: {
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
    }, {
        tableName: 'countries',
        timestamps: true,
    });

    return Country;
};
