

const express = require('express');
const secteurController = require('../controllers/Secteur.controllers');

let router = express.Router();

/***********************************/
/*** Middleware pour log les dates de requête */
router.use((req, res, next) => {
    const event = new Date();
    console.log('secteur Time:', event.toString());
    next();
});

/***********************************/
/*** Routage pour la ressource Commune */
router.post('/', secteurController.addSecteurToCommune);
router.get('/:secteurId', secteurController.getOneSecteur);
router.get('/link/:codecommuneinsee', secteurController.getSecteursByCommuneINSEE);
router.put('/:id', secteurController.updateSecteur);
router.delete('/:id', secteurController.deleteSecteur);

module.exports = router;
