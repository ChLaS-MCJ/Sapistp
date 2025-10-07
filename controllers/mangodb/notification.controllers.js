/**
 * notification.controllers.js - Gestionnaire des notifications OPTIMISÉ
 * Ce module contient toutes les fonctions relatives aux notifications
 */
const { Op } = require('sequelize');
const db = require('../../db.config');
const admin = require('../../config/firebaseAdmin');
const UserModel = require('../../models/mangodb/user.models');

// Modèles de données
const CollecteAdresseModel = db.CollecteAdresse;
const PubCommuneModel = db.PubCommune;
const PubModel = db.Pub;
const Company = db.Company;

/**
 * Vérifie si une date est un jour férié
 * @param {Date} date - La date à vérifier
 * @returns {boolean} - True si c'est un jour férié
 */
function isHolidayDate(date) {
    // Jours fériés français 2025 et 2026 (statiques)
    const holidays = [
        // 2025
        '2025-01-01', // Nouvel An
        '2025-04-21', // Lundi de Pâques
        '2025-05-01', // Fête du Travail
        '2025-05-08', // Fête de la Victoire
        '2025-05-29', // Ascension
        '2025-06-09', // Lundi de Pentecôte
        '2025-07-14', // Fête nationale
        '2025-08-15', // Assomption
        '2025-11-01', // Toussaint
        '2025-11-11', // Armistice
        '2025-12-25', // Noël

        // 2026
        '2026-01-01', // Nouvel An
        '2026-04-06', // Lundi de Pâques
        '2026-05-01', // Fête du Travail
        '2026-05-08', // Fête de la Victoire
        '2026-05-14', // Ascension
        '2026-05-25', // Lundi de Pentecôte
        '2026-07-14', // Fête nationale
        '2026-08-15', // Assomption
        '2026-11-01', // Toussaint
        '2026-11-11', // Armistice
        '2026-12-25', // Noël
    ];

    const dateStr = date.toISOString().split('T')[0];
    const isHoliday = holidays.includes(dateStr);

    return isHoliday;
}

/**
 * ====================================
 * FONCTIONS UTILITAIRES
 * ====================================
 */

/**
 * Nettoie un objet pub pour l'envoi
 * @param {Object} pub - L'objet pub complet
 * @returns {Object|null} - L'objet pub nettoyé ou null
 */
const cleanPub = (pub) => {
    if (!pub) return null;
    return {
        id: pub.id,
        pub_image: pub.pub_image,
        pub_link: pub.pub_link,
    };
};

/**
 * Nettoie un objet collection pour l'envoi dans la modal
 * @param {Object} col - L'objet collection complet
 * @returns {Object} - L'objet collection nettoyé
 */
const cleanCollection = (col) => ({
    id: col.id,
    categorie: col.categorie,
    insee: col.insee,
    rivoli: col.rivoli,
    jour: col.jour,
    frequence: col.frequence,
    startMonth: col.startMonth,
    endMonth: col.endMonth,
    dayformensuel: col.dayformensuel,
});

/**
 * Nettoie un objet company pour l'envoi
 * @param {Object} comp - L'objet company complet
 * @returns {Object|null} - L'objet company nettoyé ou null
 */
const cleanCompany = (comp) => {
    if (!comp) return null;
    return {
        id: comp.id,
        company_name: comp.company_name,
    };
};

/**
 * Vérifie si une date est la veille d'une autre
 * @param {Date} targetDate - La date cible
 * @param {Date} currentDate - La date actuelle
 * @returns {boolean} - True si currentDate est la veille de targetDate
 */
function isDayBefore(targetDate, currentDate) {
    const dayBeforeTarget = new Date(targetDate);
    dayBeforeTarget.setDate(targetDate.getDate() - 1);
    return currentDate.toDateString() === dayBeforeTarget.toDateString();
}

/**
 * Trouve le prochain jour spécifique
 * @param {Date} date - La date de départ
 * @param {string} weekday - Le jour de la semaine à trouver (en français)
 * @returns {Date} - La date du prochain jour spécifié
 */
function getNextWeekdayDate(date, weekday) {
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const targetDay = days.indexOf(weekday);
    const currentDay = date.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + daysUntilTarget);
}

/**
 * Trouve le n-ième jour spécifié d'un mois
 * @param {number} year - L'année
 * @param {number} month - Le mois (0-11)
 * @param {number} weekday - Le jour de la semaine (en français)
 * @param {number} n - Le numéro d'occurrence (1 pour le premier, etc.)
 * @returns {Date|null} - La date correspondante ou null si elle n'existe pas
 */
function getNthWeekdayOfMonth(year, month, weekday, n) {
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const targetDay = days.indexOf(weekday.toLowerCase());
    if (targetDay === -1) return null;

    const firstDay = new Date(year, month, 1);
    let day = firstDay.getDay();

    let date = 1 + ((7 + targetDay - day) % 7) + (n - 1) * 7;

    if (date > new Date(year, month + 1, 0).getDate()) return null;

    return new Date(year, month, date);
}

/**
 * Trouve le dernier jour spécifié d'un mois
 * @param {number} year - L'année
 * @param {number} month - Le mois (0-11)
 * @param {string} weekday - Le jour de la semaine (en français)
 * @returns {Date|null} - La date correspondante ou null si elle n'existe pas
 */
function getLastWeekdayOfMonth(year, month, weekday) {
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const targetDay = days.indexOf(weekday.toLowerCase());
    if (targetDay === -1) return null;

    const lastDayOfMonth = new Date(year, month + 1, 0);
    let day = lastDayOfMonth.getDay();

    let date = lastDayOfMonth.getDate() - ((7 + day - targetDay) % 7);

    return new Date(year, month, date);
}

/**
 * Vérifie si une semaine est paire
 * @param {Date} date - La date à vérifier
 * @returns {boolean} - True si la semaine est paire
 */
function isEvenWeek(date) {
    const firstJanuary = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((date - firstJanuary) / 86400000) + firstJanuary.getDay() + 1) / 7);
    return weekNumber % 2 === 0;
}

/**
 * ====================================
 * FONCTIONS DE TRAITEMENT DES COLLECTES
 * ====================================
 */


/**
 * Vérifie si une collecte doit être notifiée la veille
 * @param {Object} collecte - La collecte à vérifier
 * @param {Date} now - La date actuelle
 * @param {Array} userLog - Tableau pour les logs utilisateur
 * @returns {Object} - { sendNotification, isHoliday }
 */
function checkCollecteForVeille(collecte, now, userLog = []) {
    const { frequence, jour, startMonth, endMonth, categorie } = collecte;
    let sendNotification = false;
    let isHoliday = false;

    try {
        // Date de demain (pour les notifications "la veille")
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const tomorrowWeekday = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][tomorrow.getDay()];

        if (frequence === 'journalier') {
            // Pour journalier, on vérifie demain
            if (isHolidayDate(tomorrow)) {
                isHoliday = true;
                if (userLog) userLog.push(`Jour férié (journalier)`);
                return { sendNotification: false, isHoliday };
            }
            sendNotification = true; // Toujours notifier la veille pour journalier

        } else if (frequence === 'hebdomadaire') {
            // Vérifier si demain correspond au jour de collecte
            if (jour === tomorrowWeekday) {
                if (isHolidayDate(tomorrow)) {
                    isHoliday = true;
                    if (userLog) userLog.push(`Jour férié (hebdomadaire)`);
                    return { sendNotification: false, isHoliday };
                }
                sendNotification = true;
            }

        } else if (frequence === 'hebdomadaire paire' && isEvenWeek(tomorrow)) {
            // Vérifier si demain correspond au jour de collecte ET si demain est en semaine paire
            if (jour === tomorrowWeekday) {
                if (isHolidayDate(tomorrow)) {
                    isHoliday = true;
                    if (userLog) userLog.push(`Jour férié (hebdo paire)`);
                    return { sendNotification: false, isHoliday };
                }
                sendNotification = true;
            }

        } else if (frequence === 'hebdomadaire impaire' && !isEvenWeek(tomorrow)) {
            // Vérifier si demain correspond au jour de collecte ET si demain est en semaine impaire
            if (jour === tomorrowWeekday) {
                if (isHolidayDate(tomorrow)) {
                    isHoliday = true;
                    if (userLog) userLog.push(`Jour férié (hebdo impaire)`);
                    return { sendNotification: false, isHoliday };
                }
                sendNotification = true;
            }

        } else if (frequence === 'mensuel') {
            const [occurrence, jourSemaine] = jour.split('_');
            const tomorrowYear = tomorrow.getFullYear();
            const tomorrowMonth = tomorrow.getMonth();
            let candidateDate = null;

            if (occurrence === 'last') {
                candidateDate = getLastWeekdayOfMonth(tomorrowYear, tomorrowMonth, jourSemaine);
            } else {
                candidateDate = getNthWeekdayOfMonth(tomorrowYear, tomorrowMonth, jourSemaine, parseInt(occurrence));
            }

            if (!candidateDate) return { sendNotification: false, isHoliday };

            // Vérifier si demain correspond à la date de collecte mensuelle
            if (candidateDate.toDateString() === tomorrow.toDateString()) {
                if (isHolidayDate(candidateDate)) {
                    isHoliday = true;
                    if (userLog) userLog.push(`Jour férié (mensuel)`);
                    return { sendNotification: false, isHoliday };
                }
                sendNotification = true;
            }
        }

        // Vérifier la période uniquement pour les Organiques
        if (sendNotification && categorie === 'Organiques' && startMonth && endMonth) {
            const tomorrowMonthStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}`;
            if (tomorrowMonthStr < startMonth || tomorrowMonthStr > endMonth) {
                sendNotification = false;
            }
        }

        return { sendNotification, isHoliday };
    } catch (err) {
        if (userLog) userLog.push(`Erreur collecte ${collecte.id} : ${err.message}`);
        return { sendNotification: false, isHoliday };
    }
}

/**
 * Vérifie si une collecte doit être notifiée pour rentrer les poubelles
 * @param {Object} collecte - La collecte à vérifier
 * @param {Date} now - La date actuelle
 * @param {Array} userLog - Tableau pour les logs utilisateur
 * @returns {Object} - { sendNotification, isHoliday }
 */
function checkCollecteForRentrer(collecte, now, userLog = []) {
    const { frequence, jour, startMonth, endMonth, categorie } = collecte;
    let sendNotification = false;
    let isHoliday = false;

    try {
        if (frequence === 'journalier') {
            if (isHolidayDate(now)) {
                isHoliday = true;
                if (userLog) userLog.push(`Collecte ${collecte.id} ignorée : Jour férié détecté`);
                return { sendNotification: false, isHoliday };
            }
            sendNotification = true;
            if (userLog) userLog.push(`Collecte ${collecte.id} (journalier) : Notification prête`);

        } else if (frequence === 'hebdomadaire') {
            const targetDate = getNextWeekdayDate(now, jour);
            if (userLog) userLog.push(`Prochaine date prévue pour la collecte ${collecte.id} : ${targetDate}`);

            if (targetDate.toDateString() === now.toDateString()) {
                if (isHolidayDate(targetDate)) {
                    isHoliday = true;
                    if (userLog) userLog.push(`Collecte ${collecte.id} ignorée : Jour férié détecté`);
                    return { sendNotification: false, isHoliday };
                }
                sendNotification = true;
                if (userLog) userLog.push(`Collecte ${collecte.id} (hebdomadaire) : Notification prête`);
            }

        } else if (frequence === 'hebdomadaire paire' && isEvenWeek(now)) {
            const targetDate = getNextWeekdayDate(now, jour);
            if (userLog) userLog.push(`Prochaine date prévue pour la collecte ${collecte.id} : ${targetDate}`);

            if (targetDate.toDateString() === now.toDateString()) {
                if (isHolidayDate(targetDate)) {
                    isHoliday = true;
                    if (userLog) userLog.push(`Collecte ${collecte.id} ignorée : Jour férié détecté`);
                    return { sendNotification: false, isHoliday };
                }
                sendNotification = true;
                if (userLog) userLog.push(`Collecte ${collecte.id} (hebdomadaire paire) : Notification prête`);
            }

        } else if (frequence === 'hebdomadaire impaire' && !isEvenWeek(now)) {
            const targetDate = getNextWeekdayDate(now, jour);
            if (userLog) userLog.push(`Prochaine date prévue pour la collecte ${collecte.id} : ${targetDate}`);

            if (targetDate.toDateString() === now.toDateString()) {
                if (isHolidayDate(targetDate)) {
                    isHoliday = true;
                    if (userLog) userLog.push(`Collecte ${collecte.id} ignorée : Jour férié détecté`);
                    return { sendNotification: false, isHoliday };
                }
                sendNotification = true;
                if (userLog) userLog.push(`Collecte ${collecte.id} (hebdomadaire impaire) : Notification prête`);
            }

        } else if (frequence === 'mensuel') {
            const [occurrence, jourSemaine] = jour.split('_');
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            let candidateDate = null;

            if (occurrence === 'last') {
                candidateDate = getLastWeekdayOfMonth(currentYear, currentMonth, jourSemaine);
                if (userLog) userLog.push(`Dernier ${jourSemaine} => ${candidateDate}`);
            } else {
                candidateDate = getNthWeekdayOfMonth(currentYear, currentMonth, jourSemaine, parseInt(occurrence));
                if (userLog) userLog.push(`${occurrence}ème ${jourSemaine} => ${candidateDate}`);
            }

            if (!candidateDate) {
                if (userLog) userLog.push(`Collecte ${collecte.id} ignorée : Pas de date trouvée`);
                return { sendNotification: false, isHoliday };
            }

            if (candidateDate.toDateString() === now.toDateString()) {
                if (isHolidayDate(candidateDate)) {
                    isHoliday = true;
                    if (userLog) userLog.push(`Collecte ${collecte.id} ignorée : Jour férié détecté`);
                    return { sendNotification: false, isHoliday };
                }
                sendNotification = true;
                if (userLog) userLog.push(`Collecte ${collecte.id} (mensuel) : Notification prête`);
            }
        }

        // Vérification de la période pour les collectes Organiques
        if (sendNotification && categorie === 'Organiques' && startMonth && endMonth) {
            const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            if (currentMonthStr < startMonth || currentMonthStr > endMonth) {
                sendNotification = false;
                if (userLog) userLog.push(`Collecte ${collecte.id} ignorée : Hors période (${startMonth} à ${endMonth})`);
            } else {
                if (userLog) userLog.push(`Collecte ${collecte.id} : Dans la période (${startMonth} à ${endMonth})`);
            }
        }

        return { sendNotification, isHoliday };
    } catch (error) {
        if (userLog) userLog.push(`Erreur lors du traitement de la collecte ${collecte.id} : ${error.message}`);
        return { sendNotification: false, isHoliday };
    }
}

/**
 * Vérifie si une collecte doit être notifiée le matin
 * @param {Object} collecte - La collecte à vérifier
 * @param {Date} now - La date actuelle
 * @param {Array} userLog - Tableau pour les logs utilisateur
 * @returns {Object} - { sendNotification, isHoliday }
 */
function checkCollecteForSortirLeMatin(collecte, now, userLog = []) {
    const { frequence, jour, startMonth, endMonth, categorie } = collecte;
    let sendNotification = false;
    let isHoliday = false;

    try {
        if (frequence === 'journalier') {
            if (isHolidayDate(now)) {
                isHoliday = true;
                return { sendNotification: false, isHoliday };
            }
            sendNotification = true;

        } else if (frequence === 'hebdomadaire') {
            const targetDate = getNextWeekdayDate(now, jour);

            if (isHolidayDate(now)) {
                isHoliday = true;
                return { sendNotification: false, isHoliday };
            }

            sendNotification = targetDate.toDateString() === now.toDateString();

        } else if (frequence === 'hebdomadaire paire' && isEvenWeek(now)) {
            const targetDate = getNextWeekdayDate(now, jour);

            if (isHolidayDate(now)) {
                isHoliday = true;
                return { sendNotification: false, isHoliday };
            }

            sendNotification = targetDate.toDateString() === now.toDateString();

        } else if (frequence === 'hebdomadaire impaire' && !isEvenWeek(now)) {
            const targetDate = getNextWeekdayDate(now, jour);

            if (isHolidayDate(now)) {
                isHoliday = true;
                return { sendNotification: false, isHoliday };
            }

            sendNotification = targetDate.toDateString() === now.toDateString();

        } else if (frequence === 'mensuel') {
            const [occurrence, jourSemaine] = jour.split('_');
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            let candidateDate = null;

            if (occurrence === 'last') {
                candidateDate = getLastWeekdayOfMonth(currentYear, currentMonth, jourSemaine);
            } else {
                candidateDate = getNthWeekdayOfMonth(currentYear, currentMonth, jourSemaine, parseInt(occurrence));
            }

            if (!candidateDate) return { sendNotification: false, isHoliday };

            if (isHolidayDate(candidateDate)) {
                isHoliday = true;
                return { sendNotification: false, isHoliday };
            }

            sendNotification = candidateDate.toDateString() === now.toDateString();
        }

        // Vérification de la période pour les collectes Organiques
        if (sendNotification && categorie === 'Organiques' && startMonth && endMonth) {
            const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            if (currentMonthStr < startMonth || currentMonthStr > endMonth) {
                sendNotification = false;
            }
        }

        return { sendNotification, isHoliday };
    } catch (err) {
        if (userLog) userLog.push(`Erreur collecte ${collecte.id} : ${err.message}`);
        return { sendNotification: false, isHoliday };
    }
}

/**
 * Récupère les publicités et la compagnie pour un utilisateur
 * @param {string} codeInsee - Le code INSEE de l'utilisateur
 * @returns {Promise<Object>} - { randomPub, company }
 */
async function getPubAndCompany(codeInsee) {
    const pubCommunes = await PubCommuneModel.findAll({ where: { code_commune_INSEE: codeInsee } });
    const pubIds = pubCommunes.map(pubCommune => pubCommune.pub_id);
    const pubs = await PubModel.findAll({ where: { id: pubIds } });

    let randomPub = null;
    let company = null;

    if (pubs.length > 0) {
        randomPub = pubs[Math.floor(Math.random() * pubs.length)];
        company = await Company.findOne({ where: { id: randomPub.company_id } });
    }

    return { randomPub, company };
}

/**
 * ====================================
 * FONCTION DE NOTIFICATION OPTIMISÉE
 * ====================================
 */

/**
 * Notification Firebase
 */
async function sendFirebaseNotification(data) {
    const message = {
        notification: {
            title: data.notification.title,
            body: data.notification.body,
        },
        tokens: [data.user.fcmToken],

        data: {
            notificationType: data.notificationType,
            notificationId: data.notificationId,
            timestamp: new Date().toISOString(),
            triggerSource: 'server_cron'
        }
    };

    return admin.messaging().sendEachForMulticast(message);
}

/**
 * SIMPLIFIÉ - Envoie des notifications la veille pour sortir les poubelles
 */
exports.sendNotificationVeille = async (req, res) => {
    try {
        const now = new Date();
        const users = await UserModel.find({});

        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        let notificationsSent = 0;

        for (const user of users) {
            if (!user.fcmToken) continue;

            const { codeInsee, codeRivoli } = user;

            const collections = await CollecteAdresseModel.findAll({
                where: { insee: codeInsee, rivoli: codeRivoli },
            });

            let hasMatchingCollections = false;
            let isHoliday = false;

            for (const collecte of collections) {
                if (collecte.frequence === 'apport volontaire') continue;

                const checkResult = checkCollecteForVeille(collecte, now);
                if (checkResult.sendNotification) {
                    hasMatchingCollections = true;
                }
                if (checkResult.isHoliday) {
                    isHoliday = true;
                }
            }

            // 🔥 NOUVEAU: Envoyer notification même si jour férié OU collecte normale
            if (hasMatchingCollections) {
                const notificationMessage = getNotificationMessage('sortir', isHoliday);

                if (notificationMessage) { // Vérifier que le message n'est pas null
                    await sendFirebaseNotification({
                        user,
                        notification: notificationMessage,
                        notificationType: 'sortir',
                        notificationId: `veille_${Date.now()}_${user._id}`
                    });
                    notificationsSent++;
                }
            }
        }

        return res.status(200).json({
            message: 'Notifications envoyées avec succès',
            count: notificationsSent
        });

    } catch (err) {
        return res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
};


/**
 * SIMPLIFIÉ - Envoie des notifications pour rentrer les poubelles
 */
exports.sendNotificationRentrer = async (req, res) => {
    try {
        const now = new Date();
        const users = await UserModel.find({});

        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        let notificationsSent = 0;

        // Traitement simplifié des utilisateurs
        for (const user of users) {
            // Vérifier le token FCM et les préférences
            if (!user.fcmToken || user.notificationsEnabled === false) continue;

            const { codeInsee, codeRivoli } = user;

            // Récupérer SEULEMENT les collectes pour vérifier s'il faut notifier
            const collections = await CollecteAdresseModel.findAll({
                where: { insee: codeInsee, rivoli: codeRivoli },
            });

            // Vérifier s'il y a des collectes qui nécessitent une notification
            let hasMatchingCollections = false;
            for (const collecte of collections) {
                if (collecte.frequence === 'apport volontaire') continue;

                const checkResult = checkCollecteForRentrer(collecte, now);
                if (checkResult.sendNotification) {
                    hasMatchingCollections = true;
                    break; // Pas besoin de continuer
                }
            }

            // Envoyer notification simple si nécessaire
            if (hasMatchingCollections) {
                await sendFirebaseNotification({
                    user,
                    notification: getNotificationMessage('rentrer'),
                    notificationType: 'rentrer',
                    notificationId: `rentrer_${Date.now()}_${user._id}`
                });
                notificationsSent++;
            }
        }

        return res.status(200).json({
            message: 'Notifications sent successfully',
            count: notificationsSent
        });

    } catch (error) {
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

/**
 * SIMPLIFIÉ - Envoie des notifications le matin pour sortir les poubelles
 */
exports.sendNotificationSortirLeMatin = async (req, res) => {
    try {
        const now = new Date();
        const users = await UserModel.find({});

        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        let notificationsSent = 0;

        for (const user of users) {
            if (!user.fcmToken) continue;

            const { codeInsee, codeRivoli } = user;

            const collections = await CollecteAdresseModel.findAll({
                where: { insee: codeInsee, rivoli: codeRivoli },
            });

            let hasMatchingCollections = false;
            let isHoliday = false;

            for (const collecte of collections) {
                if (collecte.frequence === 'apport volontaire') continue;

                const checkResult = checkCollecteForSortirLeMatin(collecte, now);
                if (checkResult.sendNotification) {
                    hasMatchingCollections = true;
                }
                if (checkResult.isHoliday) {
                    isHoliday = true;
                }
            }

            // 🔥 NOUVEAU: Envoyer notification même si jour férié OU collecte normale
            if (hasMatchingCollections || isHoliday) {
                const notificationMessage = getNotificationMessage('sortir', isHoliday);

                if (notificationMessage) {
                    await sendFirebaseNotification({
                        user,
                        notification: notificationMessage,
                        notificationType: 'sortir',
                        notificationId: `matin_${Date.now()}_${user._id}`
                    });
                    notificationsSent++;
                }
            }
        }

        return res.status(200).json({
            message: 'Notifications envoyées avec succès',
            count: notificationsSent
        });

    } catch (err) {
        return res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
};


/**
 * Vérifie s'il y a des collectes à afficher pour l'utilisateur - VERSION DEBUG
 * Avec logs détaillés et possibilité de tester avec une date spécifique
 */
exports.checkCurrentCollections = async (req, res) => {
    try {
        const userId = req.params.userId;
        const notificationType = req.query.type || 'sortir';

        // Récupérer l'utilisateur
        const user = await UserModel.findOne({ idgoogle: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        const { codeInsee, codeRivoli, notificationsEnabled } = user;

        // Vérifier les préférences pour les notifications "rentrer"
        if (notificationType === 'rentrer' && notificationsEnabled === false) {
            return res.status(200).json({
                success: false,
                message: 'Notifications pour rentrer les poubelles désactivées par l\'utilisateur'
            });
        }

        // Récupérer les collectes
        const collections = await CollecteAdresseModel.findAll({
            where: { insee: codeInsee, rivoli: codeRivoli },
        });

        if (!collections || collections.length === 0) {
            return res.status(200).json({
                success: false,
                message: 'Aucune collecte trouvée pour cette adresse'
            });
        }

        const now = new Date();
        let matchingCollections = [];
        let isHoliday = false;

        for (const collecte of collections) {
            if (collecte.frequence === 'apport volontaire') continue;

            let checkResult;
            if (notificationType === 'sortir') {
                checkResult = checkCollecteForSortirLeMatin(collecte, now);
            } else if (notificationType === 'rentrer') {
                checkResult = checkCollecteForRentrer(collecte, now);
            }

            if (checkResult && checkResult.sendNotification) {
                matchingCollections.push(collecte);
            }

            if (checkResult && checkResult.isHoliday) {
                isHoliday = true;
            }
        }

        if (matchingCollections.length > 0) {
            const { randomPub, company } = await getPubAndCompany(codeInsee);

            const notificationData = {
                collections: JSON.stringify(matchingCollections.map(cleanCollection)),
                pubs: randomPub ? JSON.stringify(cleanPub(randomPub)) : null,
                company: company ? JSON.stringify(cleanCompany(company)) : null,
                notificationType,
                isHoliday: JSON.stringify(isHoliday),
            };

            return res.status(200).json({
                success: true,
                notificationData,
            });
        } else {
            return res.status(200).json({
                success: false,
                message: `Aucune collecte à afficher pour le type ${notificationType}`
            });
        }

    } catch (error) {
        console.error('Erreur lors de la vérification des collectes :', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification des collectes',
            error: error.message
        });
    }
};

function getNotificationMessage(notificationType, isHoliday = false) {

    if (isHoliday) {
        if (notificationType === 'sortir') {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 17) {
                return {
                    title: "Collectes reportées !",
                    body: "Collectes reportées dues au jour férié, renseignez-vous au site de votre mairie !"
                };
            } else {
                return {
                    title: "Collectes reportées !",
                    body: "Collectes reportées demain dues au jour férié, renseignez-vous au site de votre mairie !"
                };
            }
        }
        return null;
    }

    switch (notificationType) {
        case 'sortir':
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 17) {
                return {
                    title: "Sortez vos poubelles !",
                    body: "Collectes aujourd'hui - vérifiez les types de déchets"
                };
            } else {
                return {
                    title: "Sortez vos poubelles !",
                    body: "Collectes demain - préparez vos poubelles"
                };
            }
        case 'rentrer':
            return {
                title: "Rentrez vos poubelles !",
                body: "Collectes terminées - pensez à rentrer vos poubelles"
            };
        default:
            return {
                title: "Rappel collectes",
                body: "Consultez l'application pour plus de détails"
            };
    }
}

/**
 * TEST COMPLET - Teste la logique de notification pour tous les jours de la semaine
 * Cette méthode simule les notifications sur 14 jours pour détecter les problèmes
 */
exports.testWeeklyNotifications = async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ 
                message: 'userId requis dans la query string',
                example: '/test-weekly-notifications?userId=YOUR_USER_ID'
            });
        }

        // Récupérer l'utilisateur spécifique
        const user = await UserModel.findOne({ idgoogle: userId });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const { codeInsee, codeRivoli } = user;
        
        // Récupérer les collectes de l'utilisateur
        const collections = await CollecteAdresseModel.findAll({
            where: { insee: codeInsee, rivoli: codeRivoli },
        });

        if (!collections || collections.length === 0) {
            return res.status(200).json({
                message: 'Aucune collecte trouvée pour cet utilisateur',
                userInfo: { codeInsee, codeRivoli }
            });
        }

        // Test sur 14 jours (2 semaines complètes)
        const today = new Date('2025-08-29');
        let testResults = [];
        let problemsCount = 0;
        let totalNotifications = 0;

        for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
            const testDate = new Date(today);
            testDate.setDate(today.getDate() + dayOffset);
            
            let dayResult = {
                date: testDate.toISOString(),
                dateLocal: testDate.toLocaleDateString('fr-FR'),
                jourSemaine: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][testDate.getDay()],
                estJourFerie: isHolidayDate(testDate),
                estSemaineImpaire: !isEvenWeek(testDate),
                collectesAnalysees: [],
                notifications: {
                    veille: { aurait: false, message: null, problemes: [] },
                    matin: { aurait: false, message: null, problemes: [] },
                    rentrer: { aurait: false, message: null, problemes: [] }
                }
            };

            // Test pour chaque collecte
            for (const collecte of collections) {
                if (collecte.frequence === 'apport volontaire') continue;

                let collecteAnalysis = {
                    collecteId: collecte.id,
                    frequence: collecte.frequence,
                    jour: collecte.jour,
                    categorie: collecte.categorie
                };

                // TEST NOTIFICATION VEILLE (la veille de testDate)
                const yesterday = new Date(testDate);
                yesterday.setDate(testDate.getDate() - 1);
                const veilleResult = checkCollecteForVeille(collecte, yesterday, []);
                collecteAnalysis.veilleTest = {
                    testePour: testDate.toISOString(),
                    appeleLa: yesterday.toISOString(),
                    resultat: veilleResult
                };

                if (veilleResult.sendNotification) {
                    dayResult.notifications.veille.aurait = true;
                    if (!dayResult.notifications.veille.message) {
                        dayResult.notifications.veille.message = getNotificationMessage('sortir', veilleResult.isHoliday);
                    }
                }

                // TEST NOTIFICATION MATIN (le jour même)
                const matinResult = checkCollecteForSortirLeMatin(collecte, testDate, []);
                collecteAnalysis.matinTest = {
                    testePour: testDate.toISOString(),
                    resultat: matinResult
                };

                if (matinResult.sendNotification) {
                    dayResult.notifications.matin.aurait = true;
                    if (!dayResult.notifications.matin.message) {
                        dayResult.notifications.matin.message = getNotificationMessage('sortir', matinResult.isHoliday);
                    }
                }

                // TEST NOTIFICATION RENTRER (le jour même)
                const rentrerResult = checkCollecteForRentrer(collecte, testDate, []);
                collecteAnalysis.rentrerTest = {
                    testePour: testDate.toISOString(),
                    resultat: rentrerResult
                };

                if (rentrerResult.sendNotification) {
                    dayResult.notifications.rentrer.aurait = true;
                    if (!dayResult.notifications.rentrer.message) {
                        dayResult.notifications.rentrer.message = getNotificationMessage('rentrer');
                    }
                }

                dayResult.collectesAnalysees.push(collecteAnalysis);
            }

            // DÉTECTION DES PROBLÈMES
            let dayProblems = [];

            // Problème 1: Notification "veille" mais pas de "matin" le lendemain
            if (dayResult.notifications.veille.aurait && !dayResult.notifications.matin.aurait) {
                dayProblems.push("INCOHÉRENCE: Notification 'veille' prévue mais pas de notification 'matin' le jour J");
                problemsCount++;
            }

            // Problème 2: Notification "matin" mais pas de "veille" la veille
            const tomorrow = new Date(testDate);
            tomorrow.setDate(testDate.getDate() + 1);
            if (dayResult.notifications.matin.aurait) {
                // Vérifier si il y avait une notification veille hier
                let hadVeilleYesterday = false;
                for (const collecte of collections) {
                    if (collecte.frequence === 'apport volontaire') continue;
                    const yesterdayForVeille = new Date(testDate);
                    yesterdayForVeille.setDate(testDate.getDate() - 1);
                    const veilleCheck = checkCollecteForVeille(collecte, yesterdayForVeille, []);
                    if (veilleCheck.sendNotification) {
                        hadVeilleYesterday = true;
                        break;
                    }
                }
                if (!hadVeilleYesterday) {
                    dayProblems.push("INCOHÉRENCE: Notification 'matin' prévue mais aucune notification 'veille' hier");
                    problemsCount++;
                }
            }

            // Problème 3: Jour férié mal géré
            if (dayResult.estJourFerie) {
                if (dayResult.notifications.matin.aurait && !dayResult.notifications.matin.message?.title.includes("reportées")) {
                    dayProblems.push("PROBLÈME: Notification normale prévue un jour férié");
                    problemsCount++;
                }
            }

            // Problème 4: Message "collectes reportées" sans jour férié
            if (dayResult.notifications.veille.message?.title.includes("reportées") && !dayResult.estJourFerie) {
                const tomorrow = new Date(testDate);
                tomorrow.setDate(testDate.getDate() + 1);
                if (!isHolidayDate(tomorrow)) {
                    dayProblems.push("PROBLÈME: Message 'collectes reportées' sans jour férié");
                    problemsCount++;
                }
            }

            dayResult.problemes = dayProblems;

            // Compter les notifications
            if (dayResult.notifications.veille.aurait) totalNotifications++;
            if (dayResult.notifications.matin.aurait) totalNotifications++;
            if (dayResult.notifications.rentrer.aurait) totalNotifications++;

            testResults.push(dayResult);
        }

        return res.status(200).json({
            message: 'Test complet des notifications sur 14 jours',
            userInfo: {
                userId: userId,
                email: user.email,
                codeInsee: codeInsee,
                codeRivoli: codeRivoli,
                nombreCollectes: collections.length
            },
            periodeTest: {
                debut: today.toLocaleDateString('fr-FR'),
                fin: new Date(today.getTime() + 13 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
                nombreJoursTestes: 14
            },
            resume: {
                totalNotificationsPreves: totalNotifications,
                nombreProblemes: problemsCount,
                statutGlobal: problemsCount === 0 ? "✅ AUCUN PROBLÈME DÉTECTÉ" : `❌ ${problemsCount} PROBLÈME(S) DÉTECTÉ(S)`
            },
            detailsParJour: testResults
        });

    } catch (error) {
        return res.status(500).json({
            message: 'Erreur lors du test',
            error: error.message
        });
    }
};
