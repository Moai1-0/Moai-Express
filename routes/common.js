const express = require('express');
const router = express.Router();
const passport = require("passport");
const common = require('../controllers/common');
const { checkUser } = require('../middlewares/auth');

router.get('/ping', common.ping);
router.post('/cs/opinion', checkUser, common.sendOpinion);
router.get('/json/bank', common.getBankCode);

module.exports = router;