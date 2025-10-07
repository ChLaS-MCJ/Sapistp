
const db = require('../db.config');

const Adresse = require('../models/mangodb/Adresse.models');

const CollecteAdresse = db.CollecteAdresse;

const User = require('../models/mangodb/user.models');

exports.GetCollectesByAdresse = async (req, res) => {
    try {
        const { codeinsee, rivoli } = req.params;

        const collecteAdresse = await CollecteAdresse.findAll({
            where: {
                insee: codeinsee,
                rivoli: rivoli
            }
        });

        res.status(200).json({
            collectes: collecteAdresse || []
        });
    } catch (error) {
        console.error('Error fetching collectes by adresse:', error);
        res.status(500).json({ message: 'Error fetching collectes by adresse', error });
    }
};

exports.ReportCollecte = async (req, res) => {
    try {
        const { collecteId, reportText, authkeytel } = req.body;

        // Rechercher la collecte par ID
        let collecte = await CollecteAdresse.findOne({ where: { id: collecteId } });

        // Vérifier si la collecte existe
        if (!collecte) {
            return res.status(404).json({ message: 'Collecte non trouvée' });
        }

        // Enregistrer le texte du rapport dans la collecte
        collecte.report = collecte.report ? `${collecte.report}\n${reportText}` : reportText;
        
        // Mettre à jour authkeytelreport avec le authkeytel actuel
        collecte.authkeytelreport = authkeytel;
        
        await collecte.save();

        res.status(201).json({ message: 'Signalement soumis avec succès', report: collecte.report });
    } catch (error) {
        console.error('Erreur lors du signalement de la collecte:', error);
        res.status(500).json({ message: 'Erreur lors du signalement de la collecte', error: error.message });
    }
};

exports.AddCollecte = async (req, res) => {
    try {
        const { categorie, frequence, startMonth, endMonth, jour, code_insee, code_rivoli,authkeytel} = req.body;

           let newCollecte = await CollecteAdresse.create({
                categorie,
                frequence,
                jour: jour,
                startMonth: startMonth,
                endMonth: endMonth,
                insee: code_insee,
                rivoli: code_rivoli,
			   	authkeytelcollecte:authkeytel,
            });

        res.status(201).json({
            message: 'Collecte ajoutée avec succès',
            collecte: newCollecte
        });
    } catch (error) {
        console.error('Error adding collecte:', error);
        res.status(500).json({
            message: 'Erreur lors de l\'ajout de la collecte',
            error: error.message
        });
    }
};

