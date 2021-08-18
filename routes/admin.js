const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin');
const { checkUser, checkAdmin } = require('../middlewares/auth');

router.patch('/return', checkUser, admin.setReturn); // 환급 신청
router.post('/register', admin.registerAdmin); // 관리자 등록
router.post('/signin', admin.signin); // 로그인
router.get('/users', admin.getUsers);

module.exports = router;