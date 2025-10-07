const express = require('express');
const usermangoController = require('../../controllers/mangodb/usermango.controllers');
let router = express.Router();

/***********************************/
/*** Middleware pour log les dates de requête */
router.use((req, res, next) => {
    const event = new Date();
    console.log('COMMUNE Time:', event.toString());
    next();
});

/***********************************/
/*** Routage Addresse */

router.post('/save-user', usermangoController.saveUser);
router.patch('/:id/notifications', usermangoController.updateNotifications);

router.post('/info', usermangoController.fetchFullUserInfoFromBody);
router.patch('/:id/updateUserLocation', usermangoController.updateUserLocation);
router.delete('/:id', usermangoController.delUser);

router.get('/', usermangoController.getAllUsers);
router.put('/:id/block', usermangoController.updateUserBlockStatus);

router.post('/update-fcm-token', usermangoController.updateFCMToken);
router.get('/fcm-token/:userId', usermangoController.getUserToken);


module.exports = router;
