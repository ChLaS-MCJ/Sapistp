/**
 * Express Router for handling authentication routes.
 * @module authRouter
 */

/***********************************/
/*** Import necessary modules */
const express = require('express')
const companyController = require('../controllers/Company.controllers')
const GuardMulter = require('../middlewares/GuardMulter');
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
router.get('/', companyController.GetAllCompany)
router.get('/:id', companyController.GetOneCompany)
router.post('/', companyController.AddCompany)
router.patch('/:id', companyController.UpdateCompany)
router.delete('/:id', companyController.DeleteCompany)
router.patch('/:id/addpub', GuardMulter, companyController.UpdateCompanyAddPub)
router.patch('/:id/upload-logo', GuardMulter, companyController.updateCompanyLogo);

module.exports = router