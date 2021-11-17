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

router.get('/mvp/preconfirmed', checkAdmin, admin.mvpGetPreConfirmedReservation); // 이체 승인 전 예약 리스트 불러오기
router.patch('/mvp/preconfirmed', checkAdmin, admin.mvpPatchPreConfirmedReservation); // 예약 이체 승인 후 상태로 변경
router.delete('/mvp/preconfirmed', checkAdmin, admin.mvpDeletePreConfirmedReservation); // 예약 이체 승인 전 예약 취소

router.get('/mvp/actualQuantity', checkAdmin, admin.mvpGetNoActualQuantityProduct); // 실제 재고 수량 없는 프로덕트 리스트
router.patch('/mvp/actualQuantity', checkAdmin, admin.mvpPatchActualQuantityProduct); // 실제 수량 입력

router.get('/mvp/orderPreStatus', checkAdmin, admin.mvpGetOrderPreStatus); // 확정되지 않은 Order 리스트
router.patch('/mvp/orderPreStatus', checkAdmin, admin.mvpPatchOrderPreStatus); // Order 확정

module.exports = router;