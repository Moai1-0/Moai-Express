const express = require('express');
const router = express.Router();
const user = require('../controllers/user');
const { checkUser } = require('../middlewares/auth');

router.get('/products', user.getProducts); // 상품 리스트 조회
router.get('/product', user.getProduct); // 상품 상세 조회
router.get('/products/search', user.searchProducts); // 상품 검색
router.post('/signup', user.signup); // 회원가입
router.post('/signin', user.signin); // 로그인
router.post('/reserve', checkUser, user.reserveProduct); // 상품 예약
router.get('/status/reservation', checkUser, user.getReservationStatus); // 주문현황 - 예약현황 리스트
router.get('/status/reservation/detail', checkUser, user.getReservationStatusDetail); // 주문현황 - 예약현황 디테일
router.get('/status/order', checkUser, user.getOrderStatus); // 주문현황 - 수령/환급현황 리스트
router.get('/status/order/detail', checkUser, user.getOrderStatusDetail); // 주문현황 - 수령/환급현황 디테일
router.get('/history/purchase', checkUser, user.getPurchaseHistory); // 거래내역 리스트 조회
router.get('/history/purchase/detail', checkUser, user.getPurchaseHistoryDetail); // 거래내역 상세 조회


router.get('/point', checkUser, user.getRemainingPoint); // 잔여 포인트 조회
router.post('/return', checkUser, user.applyForReturn); // 환급 신청
router.get('/account', checkUser, user.getReturnAccount); // 환불 계좌 조회
router.patch('/account', checkUser, user.editReturnAccount); // 환불 계좌 수정

module.exports = router;