'use strict';

const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/register-admin', authController.registerAdmin);
router.post('/login', authController.login);
router.post('/google', authController.googleSignIn);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.get('/me', authenticate, authController.me);

module.exports = router;
