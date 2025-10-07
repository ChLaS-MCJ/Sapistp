const express = require('express');
const searchController = require('../controllers/Search.controllers');

let router = express.Router();

/***********************************/
/*** Middleware to log request dates */
router.use((req, res, next) => {
    const event = new Date();
    console.log('COLLECTE Time:', event.toString());
    next();
});

/***********************************/
/*** Routing for Collecte resource */

router.get('/insee/:codeinsee/rivoli/:rivoli', searchController.GetCollectesByAdresse);
router.post('/report', searchController.ReportCollecte);
router.post('/collecte/add', searchController.AddCollecte);

module.exports = router;
