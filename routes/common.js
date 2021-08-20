const express = require('express');
const router = express.Router();
const passport = require("passport");
const common = require('../controllers/common');

router.get('/', common.main);
router.get('/ping', common.ping);

router.get('/kakao', passport.authenticate('kakao-login'));
router.get(
    '/kakao/oauth',
    passport.authenticate('kakao-login', { failureRedirect: '/kakao' }),
    common.signupWithKakao
);
router.post('/oauth/callback/kakao', common.getKakaoCodeFromCallback);


module.exports = router;