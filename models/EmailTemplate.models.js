// models/EmailTemplate.models.js
module.exports = (sequelize) => {
    const { DataTypes } = require('sequelize');
    
    const EmailTemplate = sequelize.define('EmailTemplate', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        subject: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        html_content: {
            type: DataTypes.TEXT('long'),
            allowNull: false
        },
        variables: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Variables disponibles comme ["nom_structure", "commune", etc.]'
        },
        category: {
            type: DataTypes.ENUM('commercial', 'applitwo', 'newsletter', 'suivi', 'autre'),
            allowNull: true,
            defaultValue: 'commercial'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true
        },
        preview_image: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'URL de l\'image de prévisualisation'
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'ID de l\'utilisateur qui a créé le template'
        }
    }, {
        tableName: 'email_templates',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                fields: ['category']
            },
            {
                fields: ['is_active']
            },
            {
                fields: ['name']
            }
        ]
    });
    
    return EmailTemplate;
};