'use strict';

const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/register-admin', authController.registerAdmin);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;

