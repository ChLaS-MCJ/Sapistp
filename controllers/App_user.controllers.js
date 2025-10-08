// controllers/usermango.controller.js
const db = require('../db.config');
const AppUser = db.AppUser;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.saveUser = async (req, res) => {
    try {
        const { idgoogle, email, authKeytel, token, address, position } = req.body;

        if (!idgoogle || !email) {
            return res.status(400).json({ message: 'idgoogle et email sont requis' });
        }

        let tokenToUse = token;
        if (!tokenToUse) {
            tokenToUse = jwt.sign({ id: idgoogle, email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        }

        const { codeInsee = '00000', codeRivoli = '00000', city = '', street = '', postalcode = '' } = address || {};
        const { latitude = 0, longitude = 0 } = position || {};

        // Utiliser findOrCreate de Sequelize
        const [user, created] = await AppUser.findOrCreate({
            where: { idgoogle },
            defaults: {
                email,
                authKeytel,
                token: tokenToUse,
                codeInsee,
                codeRivoli,
                city,
                street,
                postalcode,
                latitude,
                longitude,
                notificationsEnabled: true,
                isBlocked: false
            }
        });

        if (!created) {
            // Mise à jour si l'utilisateur existe
            await user.update({
                email,
                authKeytel,
                token: tokenToUse
            });
            return res.status(200).json({ 
                message: 'Utilisateur trouvé et mis à jour avec succès', 
                user 
            });
        }

        return res.status(201).json({ 
            message: 'Nouvel utilisateur créé avec succès', 
            user 
        });

    } catch (error) {
        console.error("Erreur lors de la sauvegarde de l'utilisateur:", error);
        return res.status(500).json({
            message: "Erreur lors de la sauvegarde de l'utilisateur",
            error: error.message,
        });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await AppUser.findAll();
        res.status(200).json({ users });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

exports.updateUserBlockStatus = async (req, res) => {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (typeof isBlocked !== 'boolean') {
        return res.status(400).json({ message: 'La valeur de isBlocked doit être un booléen' });
    }

    try {
        const user = await AppUser.findOne({ where: { idgoogle: id } });
        
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        await user.update({ isBlocked });

        console.log(`État de blocage de l'utilisateur ${id} mis à jour avec succès à ${isBlocked}.`);
        res.status(200).json({ message: 'État de blocage mis à jour avec succès', user });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'état de blocage:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

exports.updateNotifications = async (req, res) => {
    try {
        const { id } = req.params;
        const { notificationsEnabled } = req.body;

        if (typeof notificationsEnabled !== 'boolean') {
            return res.status(400).json({ message: 'La valeur de notificationsEnabled doit être un booléen' });
        }

        const user = await AppUser.findOne({ where: { idgoogle: id } });
        
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        await user.update({ notificationsEnabled });

        res.status(200).json({ message: 'Notifications mises à jour avec succès', user });
    } catch (error) {
        console.error('Erreur lors de la mise à jour des notifications:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

exports.fetchFullUserInfoFromBody = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ message: "L'ID est requis dans le body" });
        }
        
        const user = await AppUser.findOne({ where: { idgoogle: id } });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        
        return res.status(200).json({ user });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        return res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

exports.updateUserLocation = async (req, res) => {
    const { id } = req.params;
    const { codeInsee, codeRivoli, city, street, postalcode } = req.body;

    if (!id) {
        return res.status(400).json({ message: "id est requis" });
    }

    try {
        const user = await AppUser.findOne({ where: { idgoogle: id } });
        
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        await user.update({
            codeInsee, 
            codeRivoli, 
            city, 
            street, 
            postalcode
        });

        res.status(200).json({ user });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la localisation:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

exports.delUser = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        console.log("Aucun ID fourni dans les paramètres.");
        return res.status(400).json({ message: "id est requis" });
    }

    try {
        const user = await AppUser.findOne({ where: { idgoogle: id } });
        
        if (!user) {
            console.log(`Utilisateur avec l'ID ${id} non trouvé pour suppression.`);
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        await user.destroy();

        console.log(`Utilisateur avec l'ID ${id} supprimé avec succès.`);
        res.status(200).json({
            message: "Utilisateur supprimé avec succès",
            logs: {
                deletedUserId: id,
                action: "deleteUser",
                status: "success"
            }
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

exports.updateFCMToken = async (req, res) => {
    const { userId, fcmToken } = req.body;
    const logs = [];
    const maxRetries = 5;
    const delay = 1000;

    try {
        logs.push(`Requête reçue pour mettre à jour le FCM Token pour l'utilisateur: ${userId}`);
        logs.push(`FCM Token reçu : ${fcmToken}`);
        
        for (let i = 0; i < maxRetries; i++) {
            const user = await AppUser.findOne({ where: { idgoogle: userId } });

            if (user) {
                logs.push(`Utilisateur trouvé : ${user.email}`);
                logs.push(`Ancien FCM Token : ${user.fcmToken || "Aucun"}`);
                
                await user.update({ fcmToken });

                logs.push("FCM Token mis à jour avec succès");
                logs.push(`Nouveau FCM Token : ${user.fcmToken}`);

                return res.status(200).json({ 
                    message: "FCM Token mis à jour avec succès", 
                    user, 
                    logs 
                });
            } else {
                logs.push(`Tentative ${i + 1}: Utilisateur non trouvé. Nouvel essai dans ${delay}ms`);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }

        logs.push("Échec: Utilisateur non trouvé après plusieurs tentatives");
        return res.status(404).json({ message: "Utilisateur non trouvé", logs });
    } catch (error) {
        logs.push(`Erreur lors de la mise à jour du FCM Token: ${error.message}`);
        console.error("Erreur lors de la mise à jour du FCM Token:", error);

        return res.status(500).json({
            message: "Erreur lors de la mise à jour du FCM Token",
            error: error.message,
            logs
        });
    }
};

exports.getUserToken = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await AppUser.findOne({ 
            where: { idgoogle: userId },
            attributes: ['fcmToken']
        });

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        return res.status(200).json({ fcmToken: user.fcmToken });
    } catch (error) {
        console.error('Erreur lors de la récupération du FCM Token:', error);
        return res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

exports.registerOrLogin = async (req, res) => {
    const logs = [];
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            logs.push("Email et password sont requis.");
            return res.status(400).json({ message: "Email et password sont requis.", logs });
        }
        
        let user = await AppUser.findOne({ where: { email } });
        
        if (user) {
            // Connexion
            if (!user.password) {
                logs.push("L'utilisateur existe mais n'a pas de mot de passe.");
                return res.status(400).json({ 
                    message: "Connexion impossible, aucun mot de passe enregistré.", 
                    logs 
                });
            }
            
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                logs.push("Mot de passe invalide.");
                return res.status(401).json({ message: "Identifiants invalides.", logs });
            }
            
            const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
            await user.update({ token });
            
            logs.push("Connexion réussie.");
            return res.status(200).json({ 
                message: "Connexion réussie.", 
                user, 
                token, 
                logs 
            });
        } else {
            // Inscription
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            const newUser = await AppUser.create({
                idgoogle: "local_" + email,
                email,
                password: hashedPassword,
                token: "",
                codeInsee: '00000',
                codeRivoli: '00000',
                city: '',
                street: '',
                postalcode: ''
            });
            
            const token = jwt.sign({ id: newUser.id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
            await newUser.update({ token });
            
            logs.push("Inscription réussie.");
            return res.status(201).json({ 
                message: "Inscription réussie.", 
                user: newUser, 
                token, 
                logs 
            });
        }
    } catch (error) {
        logs.push(`Erreur: ${error.message}`);
        console.error("Erreur dans registerOrLogin:", error);
        return res.status(500).json({ 
            message: "Erreur interne du serveur", 
            error: error.message, 
            logs 
        });
    }
};