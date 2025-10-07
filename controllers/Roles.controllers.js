const db = require('../db.config')
const Role = db.Role;

exports.getAllRoles = async (req, res) => {
    try {
        const roles = await Role.findAll();

        return res.json({ data: roles });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur de la base de données', error });
    }
};