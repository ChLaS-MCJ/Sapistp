const UserModel = require('../../models/mangodb/user.models');
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


        let user = await UserModel.findOne({ idgoogle });

        if (user) {
            user.email = email;
            user.authKeytel = authKeytel;
            user.token = tokenToUse;

            await user.save();

            return res.status(200).json({ message: 'Utilisateur trouvé et mis à jour avec succès', user });
        }

        const newUser = new UserModel({
            idgoogle,
            email,
            authKeytel,
            token: tokenToUse,
            codeInsee,
            codeRivoli,
            city,
            street,
            postalcode,
            position: { latitude, longitude },
            notificationsEnabled: true,
        });

        await newUser.save();
        return res.status(201).json({ message: 'Nouvel utilisateur créé avec succès', user: newUser });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Cet email est déjà utilisé.',
            });
        }
 
        console.error("Erreur lors de la sauvegarde de l'utilisateur:", error);

        return res.status(500).json({
            message: "Erreur lors de la sauvegarde de l'utilisateur",
            error: error.message,
        });
    }
};

// Fonction pour récupérer tous les utilisateurs
exports.getAllUsers = async (req, res) => {
    try {
        const users = await UserModel.find({});
        res.status(200).json({ users });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// Fonction pour mettre à jour l'état de blocage (isBlocked) d'un utilisateur
exports.updateUserBlockStatus = async (req, res) => {
    const { id } = req.params;
    const { isBlocked } = req.body;

    // Vérification que le champ isBlocked est un booléen
    if (typeof isBlocked !== 'boolean') {
        return res.status(400).json({ message: 'La valeur de isBlocked doit être un booléen' });
    }

    try {
        // Mise à jour de l'état de blocage
        const updatedUser = await UserModel.findOneAndUpdate(
            { idgoogle: id },
            { isBlocked },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        console.log(`État de blocage de l'utilisateur ${id} mis à jour avec succès à ${isBlocked}.`);
        res.status(200).json({ message: 'État de blocage mis à jour avec succès', user: updatedUser });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'état de blocage:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// Contrôleur pour mettre à jour l'état des notifications
exports.updateNotifications = async (req, res) => {
    try {
        const { id } = req.params;
        const { notificationsEnabled } = req.body;

        if (typeof notificationsEnabled !== 'boolean') {
            return res.status(400).json({ message: 'La valeur de notificationsEnabled doit être un booléen' });
        }

        // Met à jour le champ notificationsEnabled en recherchant par idgoogle
        const user = await UserModel.findOneAndUpdate(
            { idgoogle: id },
            { notificationsEnabled },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json({ message: 'Notifications mises à jour avec succès', user });
    } catch (error) {
        console.error('Erreur lors de la mise à jour des notifications:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

exports.fetchFullUserInfoFromBody = async (req, res) => {
  try {
    const { id } = req.body; // Lire l'ID depuis le body
    if (!id) {
      return res.status(400).json({ message: "L'ID est requis dans le body" });
    }
    
    const user = await UserModel.findOne({ idgoogle: id });
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
        const updatedUser = await UserModel.findOneAndUpdate(
            { idgoogle: id },
            { codeInsee, codeRivoli, city, street, postalcode },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

 
        res.status(200).json({ user: updatedUser });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la localisation de l\'utilisateur:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

exports.delUser = async (req, res) => {
    const { id } = req.params;

    // Vérifiez que l'ID est fourni dans les paramètres
    if (!id) {
        console.log("Aucun ID fourni dans les paramètres.");
        return res.status(400).json({ message: "id est requis" });
    }

    try {
        // Tentative de suppression de l'utilisateur de la base de données
        const deletedUser = await UserModel.findOneAndDelete({ idgoogle: id });

        if (!deletedUser) {
            console.log(`Utilisateur avec l'ID ${id} non trouvé pour suppression.`);
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

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
            error: error.message,
            logs: {
                action: "deleteUser",
                status: "error",
                error: error.message
            }
        });
    }
};

exports.updateFCMToken = async (req, res) => {
	const { userId, fcmToken } = req.body;
	const logs = []; // Tableau pour stocker les logs

	const maxRetries = 5;
	const delay = 1000;

	try {
		// Log de la requête reçue
		logs.push(`Requête reçue pour mettre à jour le FCM Token pour l'utilisateur avec ID Google: ${userId}`);
		logs.push(`FCM Token reçu : ${fcmToken}`);
		
		for (let i = 0; i < maxRetries; i++) {
			const user = await UserModel.findOne({ idgoogle: userId });

			if (user) {
				// Log avant la mise à jour du FCM Token
				logs.push(`Utilisateur trouvé : ${user.email}`);
				logs.push(`Ancien FCM Token : ${user.fcmToken || "Aucun"}`);
				
				user.fcmToken = fcmToken;
				await user.save();

				// Log après la mise à jour
				logs.push("FCM Token mis à jour avec succès");
				logs.push(`Nouveau FCM Token : ${user.fcmToken}`);

				return res.status(200).json({ message: "FCM Token mis à jour avec succès", user, logs });
			} else {
				logs.push(`Tentative ${i + 1}: Utilisateur non trouvé. Nouvel essai dans ${delay}ms`);
			}

			// Attendre avant de réessayer
			await new Promise(resolve => setTimeout(resolve, delay));
		}

		// Si l'utilisateur n'a pas été trouvé après toutes les tentatives
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
        const user = await UserModel.findOne({ idgoogle: userId }, 'fcmToken').lean();

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
        
        // Vérification des paramètres obligatoires
        if (!email || !password) {
            logs.push("Email et password sont requis.");
            return res.status(400).json({ message: "Email et password sont requis.", logs });
        }
        
        // Recherche de l'utilisateur par email
        let user = await UserModel.findOne({ email });
        
        if (user) {
            // L'utilisateur existe : on tente une connexion
            if (!user.password) {
                logs.push("L'utilisateur existe déjà mais n'a pas de mot de passe défini pour une connexion par email.");
                return res.status(400).json({ message: "Connexion impossible, aucun mot de passe enregistré pour cet utilisateur.", logs });
            }
            
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                logs.push("Mot de passe invalide.");
                return res.status(401).json({ message: "Identifiants invalides.", logs });
            }
            
            // Génération d'un token JWT
            const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
            user.token = token;
            await user.save();
            logs.push("Connexion réussie.");
            return res.status(200).json({ message: "Connexion réussie.", user, token, logs });
        } else {
            // Aucun utilisateur trouvé, on procède à l'inscription
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Création d'un nouvel utilisateur pour une inscription par email
            const newUser = new UserModel({
                idgoogle: "local_" + email,
                email,
                authKeytel: null,
                token: "",       
                password: hashedPassword,
                codeInsee: null,
                codeRivoli: null,
                city: null,
                street: null,
                postalcode: null,
            });
            
            // Génération d'un token JWT
            const token = jwt.sign({ id: newUser._id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
            newUser.token = token;
            
            await newUser.save();
            logs.push("Inscription réussie.");
            return res.status(201).json({ message: "Inscription réussie.", user: newUser, token, logs });
        }
    } catch (error) {
        logs.push(`Erreur: ${error.message}`);
        console.error("Erreur dans registerOrLogin:", error);
        return res.status(500).json({ message: "Erreur interne du serveur", error: error.message, logs });
    }
};


