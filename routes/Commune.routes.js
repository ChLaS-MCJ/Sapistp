const express = require('express');
const communeController = require('../controllers/Commune.controllers');

let router = express.Router();

/***********************************/
/*** Middleware pour log les dates de requête */
router.use((req, res, next) => {
    const event = new Date();
    console.log('COMMUNE Time:', event.toString());
    next();
});

/***********************************/
/*** Routage pour la ressource Commune */
router.get('/region/:regionCode', communeController.getCommunesByRegionCode);
router.get('/', communeController.GetAllCommunes);
router.get('/:code_commune_INSEE', communeController.GetOneCommune);
router.post('/', communeController.AddCommune);
router.patch('/:id', communeController.UpdateCommune);
router.delete('/:id', communeController.DeleteCommune);
router.get('/:codecommuneinsee/pubs', communeController.GetCommunePubs);
router.post('/:codecommuneinsee/pubs', communeController.AddPubToCommune);
router.delete('/:codecommuneinsee/pubs/:pubId', communeController.RemovePubFromCommune);


module.exports = router;
