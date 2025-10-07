const db = require('../db.config');
const Collecte = db.CollecteAdresse;

exports.GetAllCollectesAdresse = async (req, res) => {
    try {
        const collectes = await Collecte.findAll();
        res.status(200).json(collectes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCollecteAdresseByInseeAndRivoli = async (req, res) => {
    try {
        const { codeinsee, rivoli } = req.params;

        const collectes = await Collecte.findAll({
            where: {
                insee: codeinsee,
                rivoli: rivoli
            }
        });

        if (collectes && collectes.length > 0) {
            res.status(200).json(collectes);
        } else {
            res.status(200).json({ message: 'Collecte non trouvée', data: [] });
        }
    } catch (error) {
        console.error('Error fetching collectes:', error);

        res.status(500).json({
            message: 'Erreur lors de la récupération des collectes',
            error: error.message,
            logs: {
                requestParams: req.params
            }
        });
    }
};

exports.AddCollecteAdresse = async (req, res) => {
    try {
        const { categorie, jour, insee, rivoli, frequence, startMonth, endMonth, dayformensuel } = req.body;

        const newCollecte = await Collecte.create({
            categorie,
            jour,
            frequence,
            insee,
            rivoli,
            startMonth: startMonth || null,
            endMonth: endMonth || null,
            dayformensuel: dayformensuel,
        });

        // Réponse réussie
        res.status(201).json({
            message: 'Collecte adresse ajoutée avec succès',
            collecte: newCollecte,
        });
    } catch (error) {
        // Log de l'erreur
        console.error('Error adding collecte adresse:', error);

        // Réponse en cas d'erreur
        res.status(500).json({
            message: 'Erreur lors de l\'ajout de la collecte adresse',
            error: error.message,
        });
    }
};


exports.UpdateCollecteAdresse = async (req, res) => {
    try {
        const { categorie, jour, frequence, insee, rivoli, startMonth, endMonth, dayformensuel, report } = req.body;

        const [updated] = await Collecte.update(
            {
                categorie,
                jour,
                frequence,
                insee,
                rivoli,
                startMonth: startMonth || null,
                endMonth: endMonth || null,
                dayformensuel: dayformensuel || null,
                report,
            },
            { where: { id: req.params.id } }
        );

        if (updated) {
            const updatedCollecte = await Collecte.findByPk(req.params.id);
            res.status(200).json(updatedCollecte);
        } else {
            res.status(404).json({ message: 'Collecte non trouvée' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.DeleteCollecteAdresse = async (req, res) => {
    try {
        const deleted = await Collecte.destroy({ where: { id: req.params.id } });
        if (deleted) {
            res.status(200).json({ message: 'Collecte supprimée' });
        } else {
            res.status(404).json({ message: 'Collecte non trouvée' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};