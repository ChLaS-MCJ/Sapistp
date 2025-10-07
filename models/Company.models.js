/**
 * Creates a model for the "Company" table in the database using the Sequelize library.
 * The "Company" table has columns for:
 * - Nom (name)
 * - Téléphone (phone)
 * - Numéro SIRET (siretNumber)
 * - Adresse (address)
 * - Pays (country)
 * - Ville (city)
 * - Code postal (postalCode)
 * - RIB (bank details)
 * - Mail (email)
 * - Activité (activity)
 * The model is configured to enable soft deletion (paranoid mode).
 * @param {object} sequelize - The Sequelize object used to connect to the database.
 * @returns {object} - The created Company model.
 */
const companyModel = (sequelize) => {
    const { DataTypes } = require('sequelize');

    return sequelize.define('Company', {
        id: {
            type: DataTypes.INTEGER(10),
            primaryKey: true,
            autoIncrement: true
        },
        company_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        company_telephone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        company_num_siret: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        code_naf: {
            type: DataTypes.STRING,
            allowNull: true,
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
        mail: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isEmail: true,
            },
        },
        activite: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        monthly_revenue: {
            type: DataTypes.STRING,
            allowNull: true,
        },
		logo: {
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
        }
    }, {
        paranoid: true,
        tableName: 'companies',
        timestamps: true,
    });
};

module.exports = companyModel;
