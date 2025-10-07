// models/EmailTracking.models.js
module.exports = (sequelize) => {
    const { DataTypes } = require('sequelize');
    
    const EmailTracking = sequelize.define('EmailTracking', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        tracking_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        message_id: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        recipient_email: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        recipient_structure: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        subject: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        campaign_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: 'sors-ta-poubelle'
        },
        status: {
            type: DataTypes.ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced'),
            allowNull: true,
            defaultValue: 'sent'
        },
        opened: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },
        opened_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        opened_via: {
            type: DataTypes.ENUM('logo', 'webhook', 'proxy', 'logo_applitwo'),
            allowNull: true
        },
        clicked: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },
        clicked_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        clicked_links: {
            type: DataTypes.JSON,
            allowNull: true
        },
        bounced: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },
        bounced_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        bounce_reason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        engagement_score: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        template_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        user_data: {
            type: DataTypes.JSON,
            allowNull: true
        },
        sent_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'email_tracking',
        timestamps: false, // On gère manuellement sent_at et updated_at
        underscored: true,
        indexes: [
            {
                fields: ['tracking_id']
            },
            {
                fields: ['message_id']
            },
            {
                fields: ['recipient_email']
            },
            {
                fields: ['status']
            },
            {
                fields: ['opened']
            },
            {
                fields: ['clicked']
            }
        ]
    });
    
    return EmailTracking;
};