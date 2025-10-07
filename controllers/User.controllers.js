/***********************************/
/*** Import des module nécessaires */
const db = require('../db.config');
const User = db.User;
const Role = db.Role;
const path = require('path');
require('dotenv').config();
const bcrypt = require('bcrypt');
const fs = require('fs');

/**
 * Retrieves a specific user from the database based on the provided id parameter and sends it as a JSON response.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - JSON response with user data or error message.
 */
exports.getUser = async (req, res) => {
    let userId = parseInt(req.params.id)

    if (!userId) {
        return res.status(400).json({ message: 'Missing Parameter' });
    }

    try {
        let user = await User.findOne({ where: { id: userId } });

        if (user === null) {
            return res.status(404).json({ message: 'This user does not exist !' });
        }

        return res.json({ data: user });
    } catch (err) {
        return res.status(500).json({ message: 'Database Error', error: err });
    }
}

/**
 * Retrieves all users from the database and sends the data as a JSON response.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - JSON response with user data or error message.
 */
exports.getAllUsers = async (req, res) => {
    try {
        const Users = await User.findAll({
            include: [Role],
        });

        return res.json({ data: Users });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur de la base de données', error });
    }
};

/**
 * Updates a specific user in the database based on the provided id parameter and the request body.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - JSON response with success message or error message.
 */
exports.updateUser = async (req, res) => {
    let userId = parseInt(req.params.id);

    if (!userId) {
        return res.status(400).json({ message: 'Missing parameter' });
    }

    try {
        let user = await User.findOne({ where: { id: userId }, raw: true });
        if (user === null) {
            return res.status(404).json({ message: 'This user does not exist!' });
        }

        if (req.file) {
            const imagePath = `${req.protocol}://${req.get("host")}/api/images/${req.file.filename
                }`;
            req.body.image = imagePath;

            if (user.image) {
                const pathInfo = path.parse(user.image);
                const oldImagePath = "Assets/Images/" + pathInfo.base;
                fs.unlink(`${oldImagePath}`, async () => {
                    await User.update(req.body, { where: { id: userId } })
                });
            }
        }

        if (req.body.password) {
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUND);
            req.body.password = await bcrypt.hash(req.body.password, saltRounds);
        }

        await User.update(req.body, { where: { id: userId } })

        let userInfo = await User.findOne({ where: { id: userId } })
        return res.json({ message: 'User Updated', user: userInfo })
    } catch (err) {
        return res.status(500).json({ message: 'Database Error', error: err })
    }
};

/**
 * Restores a user from the trash in the database based on the provided id parameter.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - JSON response with success message or error message.
 */
exports.untrashUser = (req, res) => {
    let userId = parseInt(req.params.id)

    if (!userId) {
        return res.status(400).json({ message: 'Missing parameter' })
    }

    User.restore({ where: { id: userId } })
        .then(() => res.status(204).json({}))
        .catch(err => res.status(500).json({ message: 'Database Error', error: err }))
}

/**
 * Moves a user to the trash in the database based on the provided id parameter.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - JSON response with success message or error message.
 */
exports.trashUser = (req, res) => {
    let userId = parseInt(req.params.id)

    if (!userId) {
        return res.status(400).json({ message: 'Missing parameter' })
    }

    User.destroy({ where: { id: userId } })
        .then(() => res.status(204).json({}))
        .catch(err => res.status(500).json({ message: 'Database Error', error: err }))
}

/**
 * Permanently deletes a user from the database based on the provided id parameter.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - JSON response with success message or error message.
 */
exports.deleteUser = (req, res) => {
    let userId = parseInt(req.params.id)

    if (!userId) {
        return res.status(400).json({ message: 'Missing parameter' })
    }

    User.destroy({ where: { id: userId }, force: true })
        .then(() => res.status(204).json({}))
        .catch(err => res.status(500).json({ message: 'Database Error', error: err }))
}


