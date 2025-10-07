// notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/mangodb/notification.controllers.js');

// Route pour envoyer une notification de test
router.get('/sendNotificationVeille', notificationController.sendNotificationVeille);
router.get('/sendNotificationRentrer', notificationController.sendNotificationRentrer);
router.get('/sendNotificationSortirLeMatin', notificationController.sendNotificationSortirLeMatin);
router.get('/check-collections/:userId', notificationController.checkCurrentCollections);


router.get('/test-weekly-notifications', notificationController.testWeeklyNotifications);
// Dans votre fichier de routes (ex: routes/notifications.js)
module.exports = router;
