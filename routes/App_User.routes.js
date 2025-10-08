const express = require('express');
const appuserController = require('../controllers/AppUser.controllers');
let router = express.Router();

/***********************************/
/*** Middleware pour log les dates de requête */
router.use((req, res, next) => {
    const event = new Date();
    console.log('APP_USER  Time:', event.toString());
    next();
});

/***********************************/
/*** Routage Addresse */

router.post('/save-user', appuserController.saveUser);
router.patch('/:id/notifications', appuserController.updateNotifications);

router.post('/info', appuserController.fetchFullUserInfoFromBody);
router.patch('/:id/updateUserLocation', appuserController.updateUserLocation);
router.delete('/:id', appuserController.delUser);

router.get('/', appuserController.getAllUsers);
router.put('/:id/block', appuserController.updateUserBlockStatus);

router.post('/update-fcm-token', appuserController.updateFCMToken);
router.get('/fcm-token/:userId', appuserController.getUserToken);


module.exports = router;
