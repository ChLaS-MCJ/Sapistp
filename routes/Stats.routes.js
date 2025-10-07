/**
 * Express Router for handling Stats routes.
 * @module epciTarificationRouter
 */

/***********************************/
/*** Import necessary modules */
const express = require('express');
const StatsController = require('../controllers/Stats.controllers');
/***************************************/

/*** Get the express router */
let router = express.Router();

/*********************************************/
/*** Middleware to log request dates */
router.use((req, res, next) => {
    const event = new Date();
    console.log('Stats Time:', event.toString());
    next();
});

/***********************************/
/*** Routing for Stats resource */
router.get('/with-collectes', StatsController.getCommunesWithCollectes);
router.get('/defaultcompanies', StatsController.getDefaultCompanies);
router.get('/ca-data', StatsController.getStats);
router.get('/reported-collects', StatsController.getReportedCollects);

module.exports = router;
