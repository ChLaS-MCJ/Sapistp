/**
 * This code snippet is a part of a JavaScript module that handles user authentication.
 * It includes functions for user login, registration, and refreshing access tokens.
 * The code uses the `jsonwebtoken` library to generate and verify JSON Web Tokens (JWTs).
 * It also interacts with a database using the `db` module.
 *
 * @module UserAuthentication
 *
 * @summary
 * This module provides functions for user authentication, including login, registration, and token refreshing.
 *
 * @description
 * This module exports the following functions:
 * - `login`: Handles user login by verifying the email and password, generating an access token, and returning it in the response.
 * - `register`: Handles user registration by validating the user data, checking if the user already exists, creating a new user, and returning the created user in the response.
 * - `refreshToken`: Handles token refreshing by verifying the refresh token, generating a new access token, and returning it in the response.
 *
 * @requires jwt
 * @requires db
 *
 * @exports {Function} login - Handles user login.
 * @exports {Function} register - Handles user registration.
 * @exports {Function} refreshToken - Handles token refreshing.
 */
/***********************************/
/*** Import des module nécessaires */
const jwt = require('jsonwebtoken')
const db = require('../db.config')
const path = require('path');
const fs = require('fs');
const User = db.User
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Generates a JSON Web Token (JWT) access token for a user.
 * @param {object} user - The user object containing user information.
 * @param {number} user.id - The user's ID.
 * @param {string} user.nom - The user's last name.
 * @param {string} user.prenom - The user's first name.
 * @param {string} user.email - The user's email address.
 * @returns {string} - The generated access token.
 */
const generateAccessToken = (user) => {
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
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_DURING }
  );
};

/**
 * Handles the login process by checking the email and password provided by the user, validating them,
 * and generating an access token if the credentials are correct.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - The response object.
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Bad email or password' });
  }

  try {
    let user = await User.findOne({ where: { email }, raw: true });

    if (user === null) {
      return res.status(401).json({ message: 'This account does not exist!' });
    }

    let isPasswordValid = await User.checkPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Wrong password' });
    }

    let accessToken = generateAccessToken(user);

    const refreshToken = await User.generateAccessTokenWithRefresh(user);

    return res.json({ access_token: accessToken, refresh_token: refreshToken });
  } catch (err) {
    console.error('Login process failed', err);
    res.status(500).json({ message: 'Login process failed', error: err });
  }
};

/**
 * Handles the registration of a user.
 * 
 * @param {Object} req - The request object containing the user's data.
 * @param {Object} res - The response object used to send the response back to the client.
 * @returns {Object} - The response object with the appropriate status code and JSON response.
 */
exports.register = async (req, res) => {

  const { nom, prenom, pseudo, email, password } = req.body

  if (!nom || !prenom || !pseudo || !email || !password) {
    return res.status(400).json({ message: 'Missing Data' })
  }

  try {
    const user = await User.findOne({ where: { email: email }, raw: true })
    if (user !== null) {
      return res.status(409).json({ message: `The user ${nom} already exists !` })
    }

    let userc = await User.create(req.body)
    return res.json({ message: 'User Created', data: userc })

  } catch (err) {
    if (err.name == 'SequelizeDatabaseError') {
      res.status(500).json({ message: 'Database Error', error: err })
    }
    res.status(500).json({ message: 'Hash Process Error', error: err })
  }
}

/**
 * Refreshes an access token.
 * 
 * @param {object} req - The request object containing the refresh token in the `body` property.
 * @param {object} res - The response object.
 * @returns {object} - The new access token is returned as the response body.
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token: refreshToken } = req.body;
    const { JWT_SECRET_REFRESH } = process.env;
    const decoded = jwt.verify(refreshToken, JWT_SECRET_REFRESH);

    const user = await User.findOne({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = await User.generateAccessTokenWithRefresh(user);

    return res.json({ access_token: newAccessToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Handles the request to reset a user's password.
 * 
 * @param {Object} req - The request object containing the user's email in the request body.
 * @param {Object} res - The response object used to send the response back to the client.
 * @returns {Object} - If the user is not found in the database, a 404 response is returned with a message indicating that the user was not found.
 *                     If there is an error sending the email, a 500 response is returned with a message indicating an internal server error.
 *                     If the email is sent successfully, a JSON response is returned indicating that the password reset token was sent successfully.
 */
exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = jwt.sign(
      { email },
      process.env.JWT_RESET_SECRET,
      { expiresIn: process.env.JWT_DURING_RESET }
    );

    await user.update({ resetToken });

    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.MAIL_USERNAME,
        clientId: process.env.OAUTH_CLIENTID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
      }
    });

    const emailTemplatePath = path.join(__dirname, '../template/TemplateEmailResetPassword.html');
    const emailTemplate = fs.readFileSync(emailTemplatePath, 'utf-8');

    const emailBody = emailTemplate.replace("{{resetTokenLink}}", `<a href="${process.env.FRONTURL}/resetpassword/?token=${resetToken}">Réinitialiser le mot de passe</a>`);

    const mailOptions = {
      from: process.env.MAIL_USERNAME,
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: emailBody,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Erreur lors de l'envoi de l'e-mail:", error);
        return res.status(500).json({
          message: 'Internal Server Error',
          error: error.toString(),
          env: {
            MAIL_USERNAME: process.env.MAIL_USERNAME,
            OAUTH_CLIENTID: process.env.OAUTH_CLIENTID,
            OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET,
            OAUTH_REFRESH_TOKEN: process.env.OAUTH_REFRESH_TOKEN,
            JWT_RESET_SECRET: process.env.JWT_RESET_SECRET,
            JWT_DURING_RESET: process.env.JWT_DURING_RESET,
            FRONTURL: process.env.FRONTURL
          }
        });
      }
      res.json({ message: 'Password reset token sent successfully' });
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};


/**
 * Resets the user's password.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - The response object.
 */
exports.resetPassword = async (req, res) => {
  try {
    const { password, resettoken } = req.body;

    const decoded = jwt.verify(resettoken, process.env.JWT_RESET_SECRET);

    const user = await User.findOne({ where: { email: decoded.email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUND));

    await user.update({ password: hashedPassword, resetToken: null });

    return res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}