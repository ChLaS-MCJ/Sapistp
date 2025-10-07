const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PubCommune = sequelize.define('PubCommune', {
        pub_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Pubs',
                key: 'id'
            },
            onDelete: 'CASCADE',
            allowNull: false
        },
        code_commune_INSEE: {
            type: DataTypes.STRING(10),
            references: {
                model: 'communes',
                key: 'code_commune_INSEE'
            },
            onDelete: 'CASCADE',
            allowNull: false
        },
        counter_pub: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        counter_click_pub: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'pubcommune',
        timestamps: true,
    });

    return PubCommune;
};
