const db = require('../db.config');
const CommuneTarification = db.CommuneTarification;

exports.GetAllTarifications = async (req, res) => {
    try {
        const tarifications = await CommuneTarification.findAll();
        return res.json({ data: tarifications });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.GetOneTarification = async (req, res) => {
    const tarificationId = parseInt(req.params.id);

    try {
        const tarification = await CommuneTarification.findOne({
            where: { id: tarificationId }
        });

        if (!tarification) {
            return res.status(404).json({ message: 'Tarification not found' });
        }

        return res.json({ data: tarification });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.CreateTarification = async (req, res) => {
    const tarificationData = req.body;

    try {
        const newTarification = await CommuneTarification.create({
            minPopulation: tarificationData.minPopulation,
            maxPopulation: tarificationData.maxPopulation,
            price: tarificationData.price,
            nbannonce: tarificationData.nbannonce,
        });

        return res.status(201).json({ message: 'Tarification added successfully', data: newTarification });
    } catch (error) {
        console.error('Database Error during creation:', error);
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.UpdateTarification = async (req, res) => {
    const updatedData = req.body;
    const tarificationId = parseInt(req.params.id);

    try {
        const tarification = await CommuneTarification.findOne({ where: { id: tarificationId } });

        if (!tarification) {
            return res.status(404).json({ message: 'Tarification not found' });
        }

        let objectTarification = {
            minPopulation: updatedData.minPopulation !== undefined ? updatedData.minPopulation : tarification.minPopulation,
            maxPopulation: updatedData.maxPopulation !== undefined ? updatedData.maxPopulation : tarification.maxPopulation,
            price: updatedData.price !== undefined ? updatedData.price : tarification.price,
            nbannonce: updatedData.nbannonce !== undefined ? updatedData.nbannonce : tarification.nbannonce,
        };

        await tarification.update(objectTarification);

        return res.json({ message: 'Tarification updated successfully', data: tarification });
    } catch (error) {
        console.error('Database Error during update:', error);
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.DeleteTarification = async (req, res) => {
    const tarificationId = parseInt(req.params.id);

    try {
        const tarification = await CommuneTarification.findOne({ where: { id: tarificationId } });

        if (!tarification) {
            return res.status(404).json({ message: 'Tarification not found' });
        }

        await tarification.destroy();

        return res.json({ message: 'Tarification deleted successfully' });
    } catch (error) {
        console.error('Database Error during deletion:', error);
        return res.status(500).json({ message: 'Database Error', error });
    }
};
