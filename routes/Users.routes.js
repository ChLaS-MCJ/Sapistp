/**
 * Express Router for handling routing of User resource.
 * @module UserRouter
 */

/***********************************/
/*** Import necessary modules */
const express = require('express');
const userCtrl = require('../controllers/User.controllers');
const GuardMulter = require('../middlewares/GuardMulter');
const router = express.Router();

/*********************************************/
/*** Middleware to log request dates */
router.use((req, res, next) => {
    const event = new Date();
    console.log('User Time:', event.toString());
    next();
});

/**********************************/
/*** Routing for User resource */
router.get('/', userCtrl.getAllUsers);
router.get('/:id', userCtrl.getUser);
router.patch('/:id', GuardMulter, userCtrl.updateUser);
router.post('/untrash/:id', userCtrl.untrashUser);
router.delete('/trash/:id', userCtrl.trashUser);
router.delete('/:id', userCtrl.deleteUser);
module.exports = router;