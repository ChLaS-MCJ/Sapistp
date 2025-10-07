/**
 * Express Router for handling EPCI Tarifications routes.
 * @module epciTarificationRouter
 */

/***********************************/
/*** Import necessary modules */
const express = require('express');
const epciTarificationController = require('../controllers/EpciTarification.controllers');
/***************************************/

/*** Get the express router */
let router = express.Router();

/*********************************************/
/*** Middleware to log request dates */
router.use((req, res, next) => {
    const event = new Date();
    console.log('EPCI Tarification Time:', event.toString());
    next();
});

/***********************************/
/*** Routing for EPCI Tarification resource */
router.get('/', epciTarificationController.GetAllTarifications);
router.get('/:id', epciTarificationController.GetOneTarification);
router.post('/', epciTarificationController.CreateTarification);
router.put('/:id', epciTarificationController.UpdateTarification);
router.delete('/:id', epciTarificationController.DeleteTarification);

module.exports = router;
