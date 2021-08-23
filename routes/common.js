const express = require('express');
const router = express.Router();
const passport = require("passport");
const common = require('../controllers/common');
const { checkUser } = require('../middlewares/auth');

router.get('/', common.main);
router.get('/ping', common.ping);

router.get('/kakao', passport.authenticate('kakao-login'));
router.post(
    '/kakao/oauth',
    passport.authenticate('kakao-login', {
        failureRedirect: 'http://localhost:8030/afterkakao',
        successRedirect: 'http://localhost:8030/'
    }),
    // common.checkKakao
);

router.post('/oauth/callback/kakao', common.getKakaoCodeFromCallback);
router.post('/test', common.main);
router.post('/test2', common.main2);

router.post('/cs/opinion', checkUser, common.sendOpinion);

module.exports = router;