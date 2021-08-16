const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin');
const { checkUser, checkAdmin } = require('../middlewares/auth');

router.patch('/return', checkAdmin, admin.setReturn); // 이체 승인
router.patch('/transfer', checkAdmin, admin.setAgreed); // 환급 신청
router.post('/register', admin.registerAdmin); // 관리자 등록
router.post('/signin', admin.signin); // 로그인

module.exports = router;