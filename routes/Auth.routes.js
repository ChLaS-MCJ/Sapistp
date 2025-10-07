/**
 * Express Router for handling authentication routes.
 * @module authRouter
 */

/***********************************/
/*** Import necessary modules */
const express = require('express')
const authController = require('../controllers/Auth.controllers')
/***************************************/

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
router.post('/login', authController.login)
router.put('/register', authController.register)
router.post('/refresh', authController.refreshToken);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

module.exports = router