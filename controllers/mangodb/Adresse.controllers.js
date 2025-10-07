const db = require('../../db.config');
const { Op } = require('sequelize');
const Commune = db.Commune;
const Adresse = require('../../models/mangodb/Adresse.models');

exports.searchCommunesByNameOrPostal = async (req, res) => {
    try {
        const { name, codePostal } = req.query;

        if (!name && !codePostal) {
            return res.status(400).json({ error: 'Un nom ou un code postal est requis.' });
        }

        let whereClause = {};

        if (name) {
            whereClause.nom_commune_postal = { [Op.like]: `%${name}%` };
        }

        if (codePostal) {
            whereClause.code_postal = { [Op.like]: `%${codePostal}%` };
        }

        const communes = await Commune.findAll({
            where: whereClause,

        });

        const uniqueCommunes = Array.from(
            new Set(communes.map(c => c.id))
        ).map(id => {
            return communes.find(c => c.id === id);
        });

        if (uniqueCommunes.length > 0) {
            res.status(200).json(uniqueCommunes);
        } else {
            res.status(404).json({ message: 'Commune non trouvée' });
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des communes:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des communes' });
    }
};

exports.getAddressesByCodeInsee = async (req, res) => {
    const { codeInsee } = req.query;

    if (!codeInsee) {
        return res.status(400).json({ message: 'Le paramètres "codeInsee" et requis.' });
    }

    try {
        const results = await Adresse.find({ code_commune_INSEE: codeInsee });

        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucune adresse trouvée pour cette commune et ce code postal.' });
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('Erreur lors de la recherche des adresses:', error);
        res.status(500).json({ message: 'Erreur lors de la recherche des adresses.' });
    }
};

exports.updateAdresse = async (req, res) => {
    const { id } = req.params;
    const {
        type,
        codeTypeVoie,
        typeVoie,
        codeRivoli,
        cleRivoli,
        libelleVoieComplet,
        code_commune_INSEE
    } = req.body;

    try {
        const adresse = await Adresse.findById(id);

        if (!adresse) {
            return res.status(404).json({ message: 'Adresse non trouvée' });
        }

        adresse.type = type || adresse.type;
        adresse.codeTypeVoie = codeTypeVoie || adresse.codeTypeVoie;
        adresse.typeVoie = typeVoie || adresse.typeVoie;
        adresse.codeRivoli = codeRivoli || adresse.codeRivoli;
        adresse.cleRivoli = cleRivoli || adresse.cleRivoli;
        adresse.libelleVoieComplet = libelleVoieComplet || adresse.libelleVoieComplet;
        adresse.code_commune_INSEE = code_commune_INSEE || adresse.code_commune_INSEE;

        await adresse.save();
        res.status(200).json(adresse);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'adresse:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'adresse' });
    }
};

exports.deleteAdresse = async (req, res) => {
    const { id } = req.params;

    try {
        const adresse = await Adresse.findById(id);

        if (!adresse) {
            return res.status(404).json({ message: 'Adresse non trouvée' });
        }

        await Adresse.deleteOne({ _id: id });
        res.status(204).send();
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'adresse:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression de l\'adresse' });
    }
};