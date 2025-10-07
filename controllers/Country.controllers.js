const db = require('../db.config');
const Country = db.Country;

/**
 * Retrieves all countries from the database and sends the data as a JSON response.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - JSON response with country data or error message.
 */
exports.getAllCountries = (req, res) => {
    Country.findAll()
        .then(countries => res.json({ data: countries }))
        .catch(err => res.status(500).json({ message: 'Database Error', error: err }));
}

/**
 * Retrieves a specific country from the database based on the provided id parameter and sends it as a JSON response.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - JSON response with country data or error message.
 */
exports.getOneCountry = async (req, res) => {
    let countryId = parseInt(req.params.id);

    if (!countryId) {
        return res.status(400).json({ message: 'Missing Parameter' });
    }

    try {
        let country = await Country.findOne({ where: { id: countryId } });
        if (country === null) {
            return res.status(404).json({ message: 'This country does not exist!' });
        }

        return res.json({ data: country });
    } catch (err) {
        return res.status(500).json({ message: 'Database Error', error: err });
    }
}
