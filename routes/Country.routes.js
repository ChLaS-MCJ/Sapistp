/**
 * Express Router for handling authentication routes.
 * @module authRouter
 */

/***********************************/
/*** Import necessary modules */
const express = require('express')
const countryController = require('../controllers/Country.controllers');

/*** Get the express router */
let router = express.Router()

/*********************************************/
/*** Middleware to log request dates */
router.use((req, res, next) => {
    const event = new Date()
    console.log('AUTH Time:', event.toString())
    next()
})

/***********************************/
/*** Routing for Auth resource */
router.get('/', countryController.getAllCountries)
router.get('/:id', countryController.getOneCountry)


module.exports = router