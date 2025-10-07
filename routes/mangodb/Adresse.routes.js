const express = require('express');
const adresseController = require('../../controllers/mangodb/Adresse.controllers');

let router = express.Router();

/***********************************/
/*** Middleware pour log les dates de requête */
router.use((req, res, next) => {
    const event = new Date();
    console.log('COMMUNE Time:', event.toString());
    next();
});

/***********************************/
/*** Routage Addresse */
router.get('/search', adresseController.searchCommunesByNameOrPostal);
router.get('/adresses', adresseController.getAddressesByCodeInsee);
router.put('/update/:id', adresseController.updateAdresse);
router.delete('/delete/:id', adresseController.deleteAdresse);

module.exports = router;
