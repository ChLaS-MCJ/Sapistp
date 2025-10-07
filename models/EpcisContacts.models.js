// models/EpcisContacts.models.js
module.exports = (sequelize) => {
    const { DataTypes } = require('sequelize');
    
    const EpcisContacts = sequelize.define('EpcisContacts', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nom_epci: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        telephone: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        horaires: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: true // Pour faire le lien avec ta table epci principale
        },
        matched: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'epci_contacts',
        timestamps: true,
        underscored: true
    });
    
    return EpcisContacts;
};