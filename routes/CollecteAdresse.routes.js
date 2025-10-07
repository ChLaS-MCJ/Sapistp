const express = require('express');
const collecteAdresseController = require('../controllers/CollecteAdresse.controllers');

let router = express.Router();

/***********************************/
/*** Middleware to log request dates */
router.use((req, res, next) => {
    const event = new Date();
    console.log('COLLECTE Time:', event.toString());
    next();
});

/***********************************/
/*** Routing for CollecteAdresse resource */
router.get('/', collecteAdresseController.GetAllCollectesAdresse);
router.get('/:codeinsee&:rivoli', collecteAdresseController.getCollecteAdresseByInseeAndRivoli);
router.post('/', collecteAdresseController.AddCollecteAdresse);
router.patch('/:id', collecteAdresseController.UpdateCollecteAdresse);
router.delete('/:id', collecteAdresseController.DeleteCollecteAdresse);

module.exports = router;
