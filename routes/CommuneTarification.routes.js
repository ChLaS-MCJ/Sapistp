// routes/CommuneTarification.routes.js
const express = require('express');
const communeTarificationController = require('../controllers/CommuneTarification.controllers');
let router = express.Router();

router.use((req, res, next) => {
    const event = new Date();
    console.log('Commune Tarification Time:', event.toString());
    next();
});

router.get('/', communeTarificationController.GetAllTarifications);
router.get('/:id', communeTarificationController.GetOneTarification);
router.post('/', communeTarificationController.CreateTarification);
router.put('/:id', communeTarificationController.UpdateTarification);
router.delete('/:id', communeTarificationController.DeleteTarification);

module.exports = router;
