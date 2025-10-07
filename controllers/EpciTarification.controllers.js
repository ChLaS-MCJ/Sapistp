const db = require('../db.config');
const Tarification = db.EpciTarification;

exports.GetAllTarifications = async (req, res) => {
    try {
        const tarifications = await Tarification.findAll();
        return res.json({ data: tarifications });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.GetOneTarification = async (req, res) => {
    const tarificationId = parseInt(req.params.id);

    try {
        const tarification = await Tarification.findOne({
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
        const newTarification = await Tarification.create({
            minCommuneCount: tarificationData.minCommuneCount,
            maxCommuneCount: tarificationData.maxCommuneCount,
            price: tarificationData.price,
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
        const tarification = await Tarification.findOne({ where: { id: tarificationId } });

        if (!tarification) {
            return res.status(404).json({ message: 'Tarification not found' });
        }

        let objectTarification = {
            minCommuneCount: updatedData.minCommuneCount !== undefined ? updatedData.minCommuneCount : tarification.minCommuneCount,
            maxCommuneCount: updatedData.maxCommuneCount !== undefined ? updatedData.maxCommuneCount : tarification.maxCommuneCount,
            price: updatedData.price !== undefined ? updatedData.price : tarification.price,
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
        const tarification = await Tarification.findOne({ where: { id: tarificationId } });

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
