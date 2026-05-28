'use strict';

const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

function publicAccountAccessDisabled(req, res) {
  return res.status(404).json({
    error: 'Public account access is disabled. Contact the administrator at kasundanelson@gmail.com.',
  });
}

router.post('/register', publicAccountAccessDisabled);
router.post('/register-admin', authController.registerAdmin);
router.post('/login', authController.login);
router.post('/google', authController.googleSignIn);
router.post('/forgot-password', publicAccountAccessDisabled);
router.post('/reset-password', publicAccountAccessDisabled);
router.post('/verify-email', publicAccountAccessDisabled);
router.post('/resend-verification', publicAccountAccessDisabled);
router.get('/me', authenticate, authController.me);

module.exports = router;
