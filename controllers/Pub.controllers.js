const db = require('../db.config');
const Pub = db.Pub;
const PubCommune = db.PubCommune;

exports.GetAllPubs = async (req, res) => {
    try {
        const pubs = await Pub.findAll();
        return res.json({ data: pubs });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.CreatePub = async (req, res) => {
    const pubData = req.body;

    try {
        const newPub = await Pub.create({
            pub_image: pubData.pub_image,
            pub_link: pubData.pub_link
        });

        return res.status(201).json({ message: 'Pub created successfully', data: newPub });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.GetPubById = async (req, res) => {
    const pubId = parseInt(req.params.id);

    try {
        const pub = await Pub.findOne({ where: { id: pubId } });

        if (!pub) {
            return res.status(404).json({ message: 'Pub not found' });
        }

        return res.json({ data: pub });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.GetPubByCodeInsee = async (req, res) => {
    const communeCodeInsee = req.params.communeCodeInsee;

    try {
        console.log(`Fetching pubs for commune INSEE code: ${communeCodeInsee}`);

        const pubs = await PubCommune.findAll({
            where: { code_commune_INSEE: communeCodeInsee },
            include: [{
                model: Pub,
                include: [{ model: Company }]
            }]
        });

        if (!pubs) {
            console.log('No pubs found');
            return res.status(404).json({ message: 'Pubs not found' });
        }

        console.log(`Found ${pubs.length} pubs for commune INSEE code: ${communeCodeInsee}`);
        return res.json({ data: pubs });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.UpdatePub = async (req, res) => {
    const pubId = parseInt(req.params.id);
    const updatedData = req.body;

    try {
        const pub = await Pub.findOne({ where: { id: pubId } });

        if (!pub) {
            return res.status(404).json({ message: 'Pub not found' });
        }

        await pub.update(updatedData);

        return res.json({ message: 'Pub updated successfully', data: pub });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.DeletePub = async (req, res) => {
    const pubId = parseInt(req.params.id);

    try {
        const pub = await Pub.findOne({ where: { id: pubId } });

        if (!pub) {
            return res.status(404).json({ message: 'Pub not found' });
        }

        await pub.destroy();

        return res.json({ message: 'Pub deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.incrementViewCount = async (req, res) => {
    try {
        const { id,insee } = req.params;
        const pubCommune = await PubCommune.findOne({ where: { pub_id: id,code_commune_INSEE: insee } });

        if (!pubCommune) {
            return res.status(404).json({ message: 'Publicité pour cette commune non trouvée' });
        }

        pubCommune.counter_pub += 1;
        await pubCommune.save();

        return res.status(200).json({ message: 'Nombre de vues incrémenté', pubCommune });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur interne du serveur', error });
    }
};

exports.incrementClickCount = async (req, res) => {
    try {
        const { id,insee } = req.params;
        const pubCommune = await PubCommune.findOne({ where: { pub_id: id,code_commune_INSEE: insee  } });

        if (!pubCommune) {
            return res.status(404).json({ message: 'Publicité pour cette commune non trouvée' });
        }

        pubCommune.counter_click_pub += 1;
        await pubCommune.save();

        return res.status(200).json({ message: 'Nombre de clics incrémenté', pubCommune });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur interne du serveur', error });
    }
};
