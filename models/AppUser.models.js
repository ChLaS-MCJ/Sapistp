// models/AppUser.models.js
module.exports = (sequelize) => {
    const { DataTypes } = require('sequelize');
    
    const AppUser = sequelize.define('AppUser', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        idgoogle: {
            type: DataTypes.STRING(255),
            unique: true,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(255),
            unique: true,
            validate: { isEmail: true }
        },
        authKeytel: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        token: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: true // Pour les inscriptions email/password
        },
        codeInsee: {
            type: DataTypes.STRING(10),
            defaultValue: '00000'
        },
        codeRivoli: {
            type: DataTypes.STRING(10),
            defaultValue: '00000'
        },
        city: {
            type: DataTypes.STRING(100),
            defaultValue: ''
        },
        street: {
            type: DataTypes.STRING(255),
            defaultValue: ''
        },
        postalcode: {
            type: DataTypes.STRING(10),
            defaultValue: ''
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 8),
            defaultValue: 0
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8),
            defaultValue: 0
        },
        fcmToken: {
            type: DataTypes.TEXT,
            defaultValue: ''
        },
        notificationsEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        isBlocked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'app_users',
        timestamps: true
    });
    
    return AppUser;
};