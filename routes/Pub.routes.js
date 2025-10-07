const express = require('express');
const router = express.Router();
const pubController = require('../controllers/Pub.controllers');


/*********************************************/
/*** Middleware to log request dates */
router.use((req, res, next) => {
    const event = new Date()
    console.log('AUTH Time:', event.toString())
    next()
})

router.get('/', pubController.GetAllPubs);
router.post('/', pubController.CreatePub);
router.get('/:id', pubController.GetPubById);
router.get('/insee/:communeCodeInsee', pubController.GetPubByCodeInsee);
router.put('/:id', pubController.UpdatePub);
router.delete('/:id', pubController.DeletePub);

router.post('/:id/increment-view/:insee', pubController.incrementViewCount);
router.post('/:id/increment-click/:insee', pubController.incrementClickCount);


module.exports = router;
