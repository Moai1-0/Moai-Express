const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin');
const { checkUser, checkAdmin } = require('../middlewares/auth');

router.patch('/return',
    // checkAdmin,
    admin.setReturn); // 이체 승인
router.patch('/transfer', checkAdmin, admin.setAgreed); // 환급 신청
router.post('/register', admin.registerAdmin); // 관리자 등록
router.post('/signin', admin.signin); // 로그인
router.get('/users', admin.getUsers); // 점주 리스트 조회
router.get('/users/detail', admin.getUser); // 점주 상세 조회
router.get('/shops', admin.getShops); // 가게 리스트 조회
router.get('/shops/detail', admin.getShop); // 가게 리스트 조회

router.get('/mvp/preconfirmed', admin.mvpGetPreConfirmedReservation); // 이체 승인 전 예약 리스트 불러오기
router.patch('/mvp/preconfirmed', admin.mvpPatchPreConfirmedReservation); // 예약 이체 승인 후 상태로 변경

module.exports = router;