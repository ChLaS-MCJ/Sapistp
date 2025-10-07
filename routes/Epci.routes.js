/**
 * Express Router for handling EPCI routes.
 * @module epciRouter
 */

/***********************************/
/*** Import necessary modules */
const express = require('express');
const epciController = require('../controllers/Epci.controllers');
/***************************************/

/*** Get the express router */
let router = express.Router();

/*********************************************/
/*** Middleware to log request dates */
router.use((req, res, next) => {
    const event = new Date();
    console.log('EPCI Time:', event.toString());
    next();
});

/***********************************/
/*** Routing for EPCI resource */
router.get('/aggregated', epciController.Aggregated);
router.get('/', epciController.GetAllEpci);
router.post('/', epciController.CreateEpci);
router.get('/:id', epciController.GetOneEpci);
router.put('/:id', epciController.UpdateEpci);
router.delete('/:id', epciController.DeleteEpci);


module.exports = router;
