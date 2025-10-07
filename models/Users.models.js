const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Defines a Sequelize model called "User" with various properties and methods.
 * @param {Object} sequelize - An instance of Sequelize used for defining the model.
 * @returns {Object} - The User model.
 */
const userModel = (sequelize) => {


  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER(10),
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      defaultValue: '',
      allowNull: false,
    },
    prenom: {
      type: DataTypes.STRING(100),
      defaultValue: '',
      allowNull: false,
    },
    pseudo: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(64),
      is: /^[0-9a-f]{64}$/i,
    },
    image: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    adresse: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    genre: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    resetToken: {
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
    tableName: 'users',
    timestamps: true,
  });

  /**
   * Hashes the user's password before creating the record.
   * @param {Object} user - The user instance being created.
   * @param {Object} options - The options passed to the create operation.
   */
  User.beforeCreate(async (user, options) => {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUND);
    user.password = await bcrypt.hash(user.password, saltRounds);
  });

  /**
   * Compares the provided password with the original password.
   * @param {string} password - The password to compare.
   * @param {string} originel - The original password to compare against.
   * @returns {boolean} - True if the passwords match, false otherwise.
   */
  User.checkPassword = async (password, originel) => {
    return bcrypt.compare(password, originel);
  };

  /**
   * Generates a refresh token for the user.
   * @param {number} userId - The ID of the user.
   * @returns {string} - The generated refresh token.
   */
  User.generateAccessTokenWithRefresh = async (user) => {
    const { JWT_SECRET_REFRESH, JWT_DURING_REFRESH } = process.env;
    return jwt.sign(
      {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        pseudo: user.pseudo,
        email: user.email,
        image: user.image,
        role: user.RoleId,
        adresse: user.adresse,
        phone: user.phone,
        genre: user.genre,
        description: user.description,
      },
      JWT_SECRET_REFRESH,
      { expiresIn: JWT_DURING_REFRESH }
    );
  };

  return User;
};

module.exports = userModel;
