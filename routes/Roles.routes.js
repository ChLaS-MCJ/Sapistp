/**
 * Express Router for handling routing of User resource.
 * @module UserRouter
 */

/***********************************/
/*** Import necessary modules */
const express = require('express');
const rolesCtrl = require('../controllers/Roles.controllers');

const router = express.Router();

/*********************************************/
/*** Middleware to log request dates */
router.use((req, res, next) => {
    const event = new Date();
    console.log('User Time:', event.toString());
    next();
});

/**********************************/
/*** Routing for Roles resource */
router.get('/', rolesCtrl.getAllRoles);
module.exports = router;