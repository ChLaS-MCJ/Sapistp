const db = require('../db.config');

const Commune = db.Commune;

const Pub = db.Pub;
const Company = db.Company;
const PubCommune = db.PubCommune;

exports.GetAllCommunes = async (req, res) => {
    try {
        const communes = await Commune.findAll();
        res.status(200).json(communes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.GetOneCommune = async (req, res) => {
    try {
        const commune = await Commune.findOne({
            where: { code_commune_INSEE: req.params.code_commune_INSEE }
        });

        if (!commune) {
            return res.status(404).json({ message: 'Commune non trouvée' });
        }

        res.status(200).json(commune);
    } catch (error) {
        console.error('Error fetching commune:', error);
        res.status(500).json({ message: error.message });
    }
};


exports.AddCommune = async (req, res) => {
    try {
        const { code_commune_INSEE, nom_commune_postal, code_postal, code_departement, code_region, population_commune, codeEpci } = req.body;
        const newCommune = await Commune.create({
            code_commune_INSEE,
            nom_commune_postal,
            code_postal,
            code_departement,
            code_region,
            population_commune,
            codeEpci
        });
        res.status(201).json(newCommune);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.UpdateCommune = async (req, res) => {
    try {
        const { code_commune_INSEE, nom_commune_postal, code_postal, code_departement, code_region, population_commune, codeEpci } = req.body;
        const [updated] = await Commune.update(
            {
                code_commune_INSEE,
                nom_commune_postal,
                code_postal,
                code_departement,
                code_region,
                population_commune,
                codeEpci
            },
            { where: { id: req.params.id } }
        );
        if (updated) {
            const updatedCommune = await Commune.findByPk(req.params.id);
            res.status(200).json(updatedCommune);
        } else {
            res.status(404).json({ message: 'Commune non trouvée' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.DeleteCommune = async (req, res) => {
    try {
        const deleted = await Commune.destroy({ where: { id: req.params.id } });
        if (deleted) {
            res.status(200).json({ message: 'Commune supprimée' });
        } else {
            res.status(404).json({ message: 'Commune non trouvée' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCommunesByRegionCode = async (req, res) => {
    const { regionCode } = req.params;

    if (!regionCode) {
        return res.status(400).json({ message: 'Invalid region code' });
    }

    try {
        const communes = await db.Commune.findAll({
            where: { code_region: regionCode }
        });

        const communeCodesInsee = communes.map(commune => commune.code_commune_INSEE);

        const pubCommuneRecords = await db.PubCommune.findAll({
            where: { code_commune_INSEE: communeCodesInsee }
        });

        const pubIds = pubCommuneRecords.map(record => record.pub_id);

        const pubs = await db.Pub.findAll({
            where: { id: pubIds },
            include: {
                model: db.Company
            }
        });

        const communesWithPubs = communes.map(commune => {
            const communePubs = pubCommuneRecords
                .filter(record => record.code_commune_INSEE === commune.code_commune_INSEE)
                .map(record => {
                    const pub = pubs.find(pub => pub.id === record.pub_id);
                    return {
                        ...pub.toJSON(),
                        PubCommune: {
                            counter_pub: record.counter_pub,
                            counter_click_pub: record.counter_click_pub
                        }
                    };
                });

            return {
                ...commune.toJSON(),
                Pubs: communePubs
            };
        });

        res.status(200).json(communesWithPubs);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Database Error', error });
    }
};

exports.GetCommunePubs = async (req, res) => {
    const codeCommuneInsee = req.params.codecommuneinsee;

    try {
        const pubCommuneRecords = await PubCommune.findAll({
            where: { code_commune_INSEE: codeCommuneInsee }
        });

        const pubIds = pubCommuneRecords.map(record => record.pub_id);

        const pubs = await Pub.findAll({
            where: {
                id: pubIds
            },
            include: [
                {
                    model: Company
                }
            ]
        });

        const pubsWithCounters = pubs.map(pub => {
            const pubCommuneRecord = pubCommuneRecords.find(record => record.pub_id === pub.id);
            return {
                ...pub.toJSON(),
                PubCommune: {
                    counter_pub: pubCommuneRecord.counter_pub,
                    counter_click_pub: pubCommuneRecord.counter_click_pub
                }
            };
        });

        return res.json({
            data: pubsWithCounters,
        });
    } catch (error) {
        console.error('Database Error:', error);

        return res.status(500).json({
            message: 'Database Error',
            error: error.message,
        });
    }
};


exports.AddPubToCommune = async (req, res) => {
    const codeCommuneInsee = req.params.codecommuneinsee;
    const { pubId } = req.body;

    try {

        // Rechercher la commune par son code INSEE
        const commune = await Commune.findOne({ where: { code_commune_INSEE: codeCommuneInsee } });

        // Rechercher la pub par son ID
        const pub = await Pub.findOne({ where: { id: pubId } });

        // Vérifier si la commune existe
        if (!commune) {
            console.log('Commune not found with INSEE code:', codeCommuneInsee);
            return res.status(404).json({ message: 'Commune not found' });
        }

        // Vérifier si la pub existe
        if (!pub) {
            console.log('Pub not found with ID:', pubId);
            return res.status(404).json({ message: 'Pub not found' });
        }

        // Créer une association entre la pub et la commune
        const pubCommune = await PubCommune.create({
            pub_id: pubId,
            code_commune_INSEE: commune.code_commune_INSEE,
        });

        // Réponse de succès
        return res.status(201).json({
            message: 'Pub added to Commune successfully',
            data: pubCommune
        });
    } catch (error) {
        // Gestion des erreurs
        console.error('Database Error:', error);
        return res.status(500).json({
            message: 'Database Error',
            error: error.message,
            logs: {
                codeCommuneInsee,
                pubId,
                error
            }
        });
    }
};

exports.RemovePubFromCommune = async (req, res) => {
    const codeCommuneInsee = req.params.codecommuneinsee;
    const pubId = req.params.pubId;

    try {
        const pubCommuneRecord = await PubCommune.findOne({
            where: {
                code_commune_INSEE: codeCommuneInsee,
                pub_id: pubId
            }
        });

        if (!pubCommuneRecord) {
            return res.status(404).json({ message: 'PubCommune record not found' });
        }

        await pubCommuneRecord.destroy();

        return res.status(200).json({ message: 'Pub removed from Commune successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

